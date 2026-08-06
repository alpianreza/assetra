import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CompliancePeriodEngine } from './period-engine.service';
import { ComplianceFrequency } from './period-engine.service';
import { ChecklistLogStatus } from '@prisma/client';

/** Canonical answer statuses (matches schema enum ChecklistLogStatus). */
export const ANSWER_STATUSES = ['ok', 'not_ok', 'na'] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

const YM_PATTERN = /^(\d{4})-(\d{2})$/;

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

  /**
   * Build the checklist calendar for one calendar month.
   *
   * Mirrors the EAMS calendar: every period of the month is listed, including
   * future ones (rendered as locked), instead of a rolling trailing window.
   */
  async inventoryPeriods(inventoryId: number, ym?: string) {
    const inventory = await this.getInventoryWithCompliance(inventoryId);
    const assignments = inventory.checklistTemplateAssignments;
    const month = this.resolveMonth(ym);

    if (assignments.length === 0) {
      return { inventoryId, ym: month.ym, periods: [] };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // One calendar lookup for the whole month instead of one per period.
    const monthStart = new Date(month.year, month.month - 1, 1);
    const monthEnd = new Date(month.year, month.month, 0);
    const offdays = await this.periodEngine.offdayDatesBetween(monthStart, monthEnd);

    const allowNA = await this.periodEngine.resolveAllowNA(inventory.itemTypeId);

    // Sessions for every assigned template, fetched once.
    const templateIds = assignments.map(a => a.template.id);
    const templateSessions = await this.prisma.checklistTemplateSession.findMany({
      where: { templateId: { in: templateIds } },
      include: { session: true },
      orderBy: { session: { sortOrder: 'asc' } },
    });
    const sessionsByTemplate = new Map<number, typeof templateSessions[number]['session'][]>();
    for (const ts of templateSessions) {
      const list = sessionsByTemplate.get(ts.templateId) ?? [];
      list.push(ts.session);
      sessionsByTemplate.set(ts.templateId, list);
    }

    // Pre-compute the calendar for each template so we know which keys to load.
    const plans = assignments.map(assignment => {
      const template = assignment.template;
      const frequency = template.itemType.checklistFrequency as ComplianceFrequency;
      const safeFrequency: ComplianceFrequency = this.periodEngine.isFrequency(frequency) ? frequency : 'monthly';
      return {
        template,
        frequency: safeFrequency,
        calendar: this.periodEngine.generateCalendarPeriods(safeFrequency, month.year, month.month),
      };
    });

    const periodKeys = Array.from(new Set(plans.flatMap(p => p.calendar.map(c => c.periodKey))));

    // Existing submissions + answer counts, batched.
    const [headers, answerGroups] = await Promise.all([
      this.prisma.checklistLog.findMany({
        where: { inventoryId, questionId: null, periodKey: { in: periodKeys } },
        select: { id: true, templateId: true, periodKey: true, sessionId: true, createdAt: true, checkedById: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.checklistLog.groupBy({
        by: ['templateId', 'periodKey', 'sessionId'],
        where: { inventoryId, questionId: { not: null }, periodKey: { in: periodKeys } },
        _count: { _all: true },
      }),
    ]);

    const headerByKey = new Map<string, typeof headers[number]>();
    for (const header of headers) {
      const key = this.occKey(header.templateId, header.periodKey, header.sessionId);
      if (!headerByKey.has(key)) headerByKey.set(key, header);
    }

    const answerCountByKey = new Map<string, number>();
    for (const group of answerGroups) {
      answerCountByKey.set(this.occKey(group.templateId, group.periodKey, group.sessionId), group._count._all);
    }

    const periods: any[] = [];

    for (const { template, frequency, calendar } of plans) {
      const sessions = sessionsByTemplate.get(template.id) ?? [];
      const sessionList: (typeof sessions[number] | null)[] = sessions.length > 0 ? sessions : [null];

      for (const calendarPeriod of calendar) {
        const { periodKey } = calendarPeriod;
        const offday = this.periodEngine.isOffdayPeriod(frequency, periodKey, offdays);

        for (const session of sessionList) {
          const key = this.occKey(template.id, periodKey, session?.id ?? null);
          const header = headerByKey.get(key) ?? null;

          const status = this.periodEngine.resolveStatus({
            frequency,
            periodKey,
            hasLog: header !== null,
            offday,
            now: today,
          });

          const editable =
            status !== 'done' &&
            status !== 'offday' &&
            this.periodEngine.isPeriodEditable(frequency, periodKey, today);

          periods.push({
            inventoryId,
            templateId: template.id,
            templateName: template.name,
            frequency,
            periodKey,
            periodLabel: calendarPeriod.label,
            periodStart: calendarPeriod.start,
            periodEnd: calendarPeriod.end,
            sessionId: session?.id ?? null,
            sessionName: session?.name ?? null,
            offday,
            status,
            editable,
            allowNA,
            questionCount: template.questions?.length ?? 0,
            answeredCount: answerCountByKey.get(key) ?? 0,
            submittedAt: header?.createdAt ?? null,
          });
        }
      }
    }

    // Most recent period first, then session order.
    periods.sort((a, b) => {
      if (a.periodKey !== b.periodKey) return b.periodKey.localeCompare(a.periodKey);
      return (a.sessionName ?? '').localeCompare(b.sessionName ?? '');
    });

    return { inventoryId, ym: month.ym, periods };
  }

  private resolveMonth(ym?: string): { year: number; month: number; ym: string } {
    if (!ym) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      return { year, month, ym: `${year}-${String(month).padStart(2, '0')}` };
    }

    const matched = YM_PATTERN.exec(ym);
    if (!matched) throw new BadRequestException('Format bulan harus YYYY-MM');

    const year = Number(matched[1]);
    const month = Number(matched[2]);
    if (month < 1 || month > 12) throw new BadRequestException('Bulan tidak valid');

    return { year, month, ym };
  }

  private occKey(templateId: number, periodKey: string, sessionId: number | null): string {
    return `${templateId}:${periodKey}:${sessionId ?? 'none'}`;
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

  /**
   * Shared guard for reading or writing an occurrence: validates the period key
   * and rejects future, off-day, and expired periods.
   */
  private async assertPeriodOpen(frequency: ComplianceFrequency, periodKey: string) {
    if (!this.periodEngine.isValidPeriodKey(frequency, periodKey)) {
      throw new BadRequestException(`Kunci periode "${periodKey}" tidak valid untuk frekuensi ${frequency}`);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (this.periodEngine.isPeriodFuture(frequency, periodKey, today)) {
      throw new BadRequestException('Checklist untuk periode masa depan tidak dapat dilakukan');
    }

    if (await this.periodEngine.isOffdayPeriodAsync(frequency, periodKey)) {
      throw new BadRequestException('Periode ini adalah hari libur');
    }

    if (!this.periodEngine.isPeriodEditable(frequency, periodKey, today)) {
      throw new BadRequestException('Periode ini sudah melewati batas waktu pengisian');
    }
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
    await this.assertPeriodOpen(frequency, periodKey);

    // Validate session if provided
    let session: any = null;
    if (sessionId != null) {
      const assignedSession = await this.prisma.checklistTemplateSession.findUnique({
        where: { templateId_sessionId: { templateId, sessionId } },
        include: { session: true },
      });
      if (!assignedSession) throw new BadRequestException('Sesi tidak terpasang pada template ini');
      session = assignedSession.session;
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
      period: {
        key: periodKey,
        label: this.periodEngine.periodLabel(frequency, periodKey),
      },
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

    const frequency = template.itemType.checklistFrequency as ComplianceFrequency;
    await this.assertPeriodOpen(frequency, periodKey);

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
    const existingHeader = await this.findOccurrence(inventoryId, templateId, periodKey, sessionId);
    const periodLabel = this.periodEngine.periodLabel(frequency, periodKey);
    const checkDate = new Date();

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
            data: { checkedById: actorId, checkDate, periodLabel, remark: null },
          })
        : await tx.checklistLog.create({
            data: {
              inventoryId,
              templateId,
              sessionId: sessionId ?? null,
              checkDate,
              periodKey,
              periodLabel,
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
            checkDate,
            periodKey,
            periodLabel,
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
    const [logs, answerGroups] = await Promise.all([
      this.prisma.checklistLog.findMany({
        where: { inventoryId, questionId: null },
        include: { template: { include: { itemType: true } }, session: true },
        orderBy: [{ checkDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.checklistLog.groupBy({
        by: ['templateId', 'periodKey', 'sessionId'],
        where: { inventoryId, questionId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const answerCountByKey = new Map<string, number>();
    for (const group of answerGroups) {
      answerCountByKey.set(this.occKey(group.templateId, group.periodKey, group.sessionId), group._count._all);
    }

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
        answerCount: answerCountByKey.get(this.occKey(l.templateId, l.periodKey, l.sessionId)) ?? 0,
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
