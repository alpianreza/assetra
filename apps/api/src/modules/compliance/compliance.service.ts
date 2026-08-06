import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CompliancePeriodEngine } from './period-engine.service';
import { ComplianceFrequency } from './period-engine.service';
import { ChecklistLogStatus } from '@prisma/client';

/** Canonical answer statuses (matches schema enum ChecklistLogStatus). */
export const ANSWER_STATUSES = ['ok', 'not_ok', 'na'] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly periodEngine: CompliancePeriodEngine,
  ) {}

  // ------------------------------------------------------------------
  // Overview: inventories that have checklist template assignments
  // ------------------------------------------------------------------
  async overview() {
    const inventories = await this.prisma.complianceInventory.findMany({
      where: {
        checklistTemplateAssignments: { some: {} },
      },
      include: {
        itemType: true,
        area: true,
        checklistTemplateAssignments: { include: { template: { include: { itemType: true } } } },
      },
      orderBy: { assetCode: 'asc' },
    });

    return inventories.map(inv => ({
      id: inv.id,
      assetCode: inv.assetCode,
      typeDescription: inv.typeDescription,
      itemTypeId: inv.itemTypeId,
      itemTypeName: inv.itemType?.name ?? null,
      areaName: inv.area?.name ?? null,
      templates: inv.checklistTemplateAssignments.map(a => ({
        id: a.template.id,
        name: a.template.name,
        frequency: a.template.itemType.checklistFrequency,
        itemTypeName: a.template.itemType.name,
      })),
    }));
  }

  // ------------------------------------------------------------------
  // Periods for an inventory (availability calendar)
  // ------------------------------------------------------------------
  async inventoryPeriods(inventoryId: number) {
    const inventory = await this.getInventoryWithCompliance(inventoryId);
    const assignments = inventory.checklistTemplateAssignments;

    if (assignments.length === 0) {
      return { inventoryId, periods: [] };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const periods: any[] = [];

    for (const assignment of assignments) {
      const template = assignment.template;
      const frequency = template.itemType.checklistFrequency as ComplianceFrequency;
      const allowNA = await this.periodEngine.resolveAllowNA(inventory.itemTypeId);

      // Template sessions
      const templateSessions = await this.prisma.checklistTemplateSession.findMany({
        where: { templateId: template.id },
        include: { session: true },
        orderBy: { session: { sortOrder: 'asc' } },
      });
      const sessions = templateSessions.map(ts => ts.session);

      // Build a set of candidate periods: today + recent history window
      // Daily: last 30 days; Weekly: last 8 weeks; Monthly: last 4 months
      const windowDays = frequency === 'daily' ? 30 : frequency === 'weekly' ? 56 : 120;
      const start = new Date(today);
      start.setDate(start.getDate() - windowDays);

      const periodKeys = this.periodEngine.periodsBetween(frequency, start, today);

      for (const periodKey of periodKeys) {
        const sessionList = sessions.length > 0 ? sessions : [null];
        for (const session of sessionList) {
          const periodStart = this.periodEngine.periodStart(frequency, periodKey, inventory.createdAt);
                    const _isFuture = false; // placeholder
          const offday = !(await this.periodEngine.isWorkingDay(periodStart));

          // Determine existing completion
          const existing = await this.findOccurrence(inventoryId, template.id, periodKey, session?.id ?? null);
          const status = this.deriveOccurrenceStatus(frequency, periodStart, today, offday, existing);

          periods.push({
            inventoryId,
            templateId: template.id,
            templateName: template.name,
            frequency,
            periodKey,
            periodLabel: this.periodLabel(frequency, periodKey),
            sessionId: session?.id ?? null,
            sessionName: session?.name ?? null,
            offday,
            status,
            allowNA,
            questionCount: template.questions?.length ?? 0,
            answeredCount: existing ? await this.countAnswersForOccurrence(inventoryId, template.id, periodKey, session?.id ?? null) : 0,
            submittedAt: existing?.createdAt ?? null,
          });
        }
      }
    }

    // Sort: by periodKey descending (most recent first), then session order
    periods.sort((a, b) => {
      if (a.periodKey !== b.periodKey) return b.periodKey.localeCompare(a.periodKey);
      return (a.sessionName ?? '').localeCompare(b.sessionName ?? '');
    });

    return { inventoryId, periods };
  }

  private periodLabel(frequency: string, periodKey: string): string {
    if (frequency === 'daily') return periodKey;
    if (frequency === 'weekly') {
      const [, w] = periodKey.split('-W');
      return `W${w}`;
    }
    return periodKey;
  }

  private async findOccurrence(inventoryId: number, templateId: number, periodKey: string, sessionId: number | null) {
    return this.prisma.checklistLog.findFirst({
      where: {
        inventoryId,
        templateId,
        periodKey,
        sessionId: sessionId ?? null,
        questionId: null, // header-level row
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async countAnswersForOccurrence(inventoryId: number, templateId: number, periodKey: string, sessionId: number | null): Promise<number> {
    return this.prisma.checklistLog.count({
      where: {
        inventoryId,
        templateId,
        periodKey,
        sessionId: sessionId ?? null,
        questionId: { not: null },
      },
    });
  }

  private deriveOccurrenceStatus(
    frequency: string,
    periodStart: Date,
    today: Date,
    offday: boolean,
    existing: any,
  ): 'completed' | 'pending' | 'late' | 'future' | 'offday' {
    if (offday) return 'offday';
    if (periodStart.getTime() > today.getTime()) return 'future';
    if (existing) return 'completed';
    // Pending vs late
    const late = this.periodEngine.isPeriodLate(frequency as any, periodStart, today);
    return late ? 'late' : 'pending';
  }

  // ------------------------------------------------------------------
  // Execution: build a checklist form for a specific occurrence
  // ------------------------------------------------------------------
  async buildExecution(inventoryId: number, templateId: number, periodKey: string, sessionId?: number | null) {
    const inventory = await this.getInventoryWithCompliance(inventoryId);

    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id: templateId },
      include: { questions: { orderBy: { sortOrder: 'asc' } }, itemType: true },
    });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    // Verify the template is assigned to this inventory
    const assigned = await this.prisma.inventoryChecklistAssignment.findUnique({
      where: { inventoryId_templateId: { inventoryId, templateId } },
    });
    if (!assigned) throw new BadRequestException('Template tidak terpasang pada inventaris ini');

    // Validate template item type matches inventory item type
    if (inventory.itemTypeId !== template.itemTypeId) {
      throw new BadRequestException('Jenis item inventaris tidak kompatibel dengan template');
    }

    const frequency = template.itemType.checklistFrequency as ComplianceFrequency;
    const periodStart = this.periodEngine.periodStart(frequency, periodKey, inventory.createdAt);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    // Future block
    if (periodStart.getTime() > today.getTime()) {
      throw new BadRequestException('Checklist untuk periode masa depan tidak dapat dilakukan');
    }

    // Offday block (a checklist cannot be executed on an off day)
    const offday = !(await this.periodEngine.isWorkingDay(periodStart));
    if (offday) {
      throw new BadRequestException('Periode ini adalah hari libur');
    }

    // Validate session if provided
    let session: any = null;
    if (sessionId != null) {
      const assigned = await this.prisma.checklistTemplateSession.findUnique({
        where: { templateId_sessionId: { templateId, sessionId } },
        include: { session: true },
      });
      if (!assigned) throw new BadRequestException('Sesi tidak terpasang pada template ini');
      session = assigned.session;
    } else {
      // If template has sessions but none provided, reject (session required)
      const templateSessions = await this.prisma.checklistTemplateSession.count({ where: { templateId } });
      if (templateSessions > 0) {
        throw new BadRequestException('Template ini membutuhkan sesi');
      }
    }

    const allowNA = await this.periodEngine.resolveAllowNA(inventory.itemTypeId);

    // Existing answers
    const existingLogs = await this.prisma.checklistLog.findMany({
      where: {
        inventoryId,
        templateId,
        periodKey,
        sessionId: sessionId ?? null,
        questionId: { not: null },
      },
    });
    const existingAnswers = new Map<number, string>();
    for (const log of existingLogs) {
      if (log.questionId != null) existingAnswers.set(log.questionId, log.status);
    }

    return {
      inventory: {
        id: inventory.id,
        assetCode: inventory.assetCode,
        itemTypeId: inventory.itemTypeId,
        itemTypeName: inventory.itemType?.name ?? null,
      },
      template: {
        id: template.id,
        name: template.name,
        frequency,
      },
      period: { key: periodKey, label: this.periodLabel(frequency, periodKey) },
      session: session ? { id: session.id, name: session.name } : null,
      allowNA,
      questions: template.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        answerType: q.answerType,
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        existingAnswer: existingAnswers.get(q.id) ?? null,
      })),
    };
  }

  // ------------------------------------------------------------------
  // Submission (atomic)
  // ------------------------------------------------------------------
  async submit(inventoryId: number, templateId: number, periodKey: string, sessionId: number | null, answers: { questionId: number; status: ChecklistLogStatus }[], actorId: number) {
    const inventory = await this.getInventoryWithCompliance(inventoryId);
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id: templateId },
      include: { questions: { orderBy: { sortOrder: 'asc' } }, itemType: true },
    });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    const allowNA = await this.periodEngine.resolveAllowNA(inventory.itemTypeId);

    const questionIds = answers.map(a => a.questionId);
    const validQuestions = await this.prisma.checklistQuestion.findMany({
      where: { id: { in: questionIds }, templateId },
      select: { id: true },
    });

    if (!allowNA && answers.some(a => a.status === 'na')) {
        throw new BadRequestException('Status N/A tidak diizinkan untuk jenis item ini');
    }

    if (validQuestions.length !== questionIds.length) {
      throw new BadRequestException('Beberapa pertanyaan tidak valid untuk template ini');
    }
    for (const a of answers) {
      if (!ANSWER_STATUSES.includes(a.status as any)) {
        throw new BadRequestException(`Status "${a.status}" tidak valid`);
      }
    }

    // Future block
    const frequency = template.itemType.checklistFrequency as ComplianceFrequency;
    const periodStart = this.periodEngine.periodStart(frequency, periodKey, inventory.createdAt);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (periodStart.getTime() > today.getTime()) {
      throw new BadRequestException('Checklist untuk periode masa depan tidak dapat dilakukan');
    }

    // Offday block
    const offday = !(await this.periodEngine.isWorkingDay(periodStart));
    if (offday) {
      throw new BadRequestException('Periode ini adalah hari libur');
    }

    // Session validation (same as execution)
    if (sessionId != null) {
      const assigned = await this.prisma.checklistTemplateSession.findUnique({
        where: { templateId_sessionId: { templateId, sessionId } },
      });
      if (!assigned) throw new BadRequestException('Sesi tidak terpasang pada template ini');
    } else {
      const templateSessions = await this.prisma.checklistTemplateSession.count({ where: { templateId } });
      if (templateSessions > 0) {
        throw new BadRequestException('Template ini membutuhkan sesi');
      }
    }

    // Unique occurrence: check for existing header
    const occKey = this.periodEngine.occurrenceKey(inventoryId, templateId, periodKey, sessionId);
    const existingHeader = await this.prisma.checklistLog.findFirst({
      where: {
        inventoryId,
        templateId,
        periodKey,
        sessionId: sessionId ?? null,
        questionId: null,
      },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Remove previous answer logs for this occurrence (recheck policy: replace current answers)
      await tx.checklistLog.deleteMany({
        where: {
          inventoryId,
          templateId,
          periodKey,
          sessionId: sessionId ?? null,
          questionId: { not: null },
        },
      });

      // Create a header log (questionId null) — represents the occurrence
      const header = existingHeader
        ? await tx.checklistLog.update({
            where: { id: existingHeader.id },
            data: { checkedById: actorId, checkDate: new Date(), remark: null },
          })
        : await tx.checklistLog.create({
            data: {
              inventoryId,
              templateId,
              sessionId: sessionId ?? null,
              checkDate: new Date(),
              periodKey,
              periodLabel: this.periodLabel(frequency, periodKey),
              status: 'ok', // header status is aggregate
              checkedById: actorId,
              questionId: null,
            },
          });

      // Create answer logs
      for (const a of answers) {
        await tx.checklistLog.create({
          data: {
            inventoryId,
            templateId,
            questionId: a.questionId,
            sessionId: sessionId ?? null,
            checkDate: new Date(),
            periodKey,
            periodLabel: this.periodLabel(frequency, periodKey),
            status: a.status,
            checkedById: actorId,
          },
        });
      }

      return header;
    });

    await this.auditService.log(actorId, 'CHECKLIST_SUBMITTED', 'ChecklistLog', result.id, undefined, { inventoryId, templateId, periodKey, sessionId, occKey }, { answerCount: answers.length });
    return { occurrenceId: result.id, occKey };
  }

  // ------------------------------------------------------------------
  // History for an inventory
  // ------------------------------------------------------------------
  async history(inventoryId: number) {
    const logs = await this.prisma.checklistLog.findMany({
      where: { inventoryId, questionId: null },
      include: { template: { include: { itemType: true } }, session: true },
      orderBy: [{ checkDate: 'desc' }, { id: 'desc' }],
    });

    return {
      inventoryId,
      logs: logs.map(l => ({
        id: l.id,
        templateId: l.templateId,
        templateName: l.template.name,
        frequency: l.template.itemType.checklistFrequency,
        periodKey: l.periodKey,
        periodLabel: l.periodLabel,
        sessionId: l.sessionId,
        sessionName: l.session?.name ?? null,
        checkDate: l.checkDate,
        checkedById: l.checkedById,
        answerCount: l.remark ? 0 : 0, // counts computed separately
        status: l.status,
      })),
    };
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  private async getInventoryWithCompliance(inventoryId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: {
        itemType: true,
        area: true,
        checklistTemplateAssignments: { include: { template: { include: { itemType: true, questions: { orderBy: { sortOrder: 'asc' } } } } } },
        picAssignments: { include: { user: true } },
      },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');
    return inventory;
  }
}
