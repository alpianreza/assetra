import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { BrandingService } from '../branding/branding.service';
import { CompliancePeriodEngine, ComplianceFrequency } from '../compliance/period-engine.service';
import { ComplianceService } from '../compliance/compliance.service';

/**
 * Module-level so it can be referenced from type positions. `typeof this.X`
 * is not valid inside the arrow functions below.
 */
const STATUS_LABELS = {
  ok: '✓',
  not_ok: '✗',
  na: '–',
} as const;

type AnswerStatus = keyof typeof STATUS_LABELS;

@Injectable()
export class ComplianceReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly brandingService: BrandingService,
    private readonly periodEngine: CompliancePeriodEngine,
    private readonly complianceService: ComplianceService,
  ) {}

  async getReportData(
    inventoryId: number,
    templateId: number,
    periodKey: string,
    sessionId: number | null,
  ) {
    // Load inventory with all relations
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: {
        category: true,
        area: true,
        itemType: true,
        picAssignments: { include: { user: true } },
        checklistTemplateAssignments: {
          where: { templateId },
          include: {
            template: {
              include: {
                itemType: true,
                questions: { orderBy: { sortOrder: 'asc' } },
                templateSessions: { include: { session: true } },
              },
            },
          },
        },
      },
    });

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const assignment = inventory.checklistTemplateAssignments.find(a => a.templateId === templateId);
    if (!assignment) throw new BadRequestException('Template tidak terpasang pada inventaris ini');

    const template = assignment.template;

    // Validate item type compatibility
    if (inventory.itemTypeId !== template.itemTypeId) {
      throw new BadRequestException('Jenis item inventaris tidak kompatibel dengan template');
    }

    const frequency = template.itemType.checklistFrequency as ComplianceFrequency;

    if (!this.periodEngine.isFrequency(frequency)) {
      throw new BadRequestException('Frekuensi checklist jenis item tidak valid');
    }
    if (!this.periodEngine.isValidPeriodKey(frequency, periodKey)) {
      throw new BadRequestException('Format periode tidak sesuai dengan frekuensi checklist');
    }

    const periodStart = this.periodEngine.periodStart(frequency, periodKey);
    const periodEnd = this.periodEngine.periodEnd(frequency, periodKey);

    if (this.periodEngine.isPeriodFuture(frequency, periodKey)) {
      throw new BadRequestException('Periode masa depan tidak dapat dilaporkan');
    }

    // Session validation
    let session: any = null;
    if (sessionId != null) {
      const assigned = await this.prisma.checklistTemplateSession.findUnique({
        where: { templateId_sessionId: { templateId, sessionId } },
        include: { session: true },
      });
      if (!assigned) throw new BadRequestException('Sesi tidak terpasang pada template ini');
      session = assigned.session;
    } else {
      // If template has sessions, session is required
      const templateSessions = await this.prisma.checklistTemplateSession.count({ where: { templateId } });
      if (templateSessions > 0) {
        throw new BadRequestException('Template ini membutuhkan sesi');
      }
    }

    // Load questions
    const questions = await this.prisma.checklistQuestion.findMany({
      where: { templateId, active: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Get existing answers (latest log per question)
    const existingLogs = await this.prisma.checklistLog.findMany({
      where: {
        inventoryId,
        templateId,
        periodKey,
        sessionId: sessionId ?? null,
        questionId: { not: null },
      },
      include: { evidence: true },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest answer per question
    const latestAnswers = new Map<number, any>();
    for (const log of existingLogs) {
      if (log.questionId && !latestAnswers.has(log.questionId)) {
        latestAnswers.set(log.questionId, log);
      }
    }

    // Build questions and answers
    const questionsData = questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      answerType: q.answerType,
      optionsJson: q.optionsJson,
      placeholder: q.placeholder,
      helpText: q.helpText,
      isRequired: q.isRequired,
      sortOrder: q.sortOrder,
      // allowNA comes from ItemType, not Question (Gate 10 correction)
      allowNA: template.itemType.allowNA,
    }));

    const answers = questions.map(q => {
      const log = latestAnswers.get(q.id);
      const status: AnswerStatus | null = log?.status ?? null;
      return {
        questionId: q.id,
        questionText: q.questionText,
        status,
        statusLabel: status ? STATUS_LABELS[status] ?? null : null,
        remark: log?.remark ?? null,
        photo: log?.photo ?? null,
        evidence: log?.evidence ?? [],
        answerType: q.answerType,
        optionsJson: q.optionsJson,
      };
    });

    // Single source of truth for period status, shared with the compliance screens.
    const offday = await this.periodEngine.isOffdayPeriodAsync(frequency, periodKey);
    const latestStatus = this.periodEngine.resolveStatus({
      frequency,
      periodKey,
      hasLog: existingLogs.length > 0,
      offday,
    });

    // Build findings
    const findings = {
      notOkCount: answers.filter(a => a.status === 'not_ok').length,
      naCount: answers.filter(a => a.status === 'na').length,
      okCount: answers.filter(a => a.status === 'ok').length,
      unansweredCount: answers.filter(a => a.status === null).length,
      details: answers,
    };

    // Branding (canonical source)
    await this.brandingService.getBranding();

    // Organization (canonical branding source)
    const org = await this.prisma.organization.findFirst();

    return {
      header: {
        organization: {
          name: org?.name ?? 'Assetra',
          shortName: org?.shortName ?? 'Assetra',
          logoUrl: null,
          address: org?.address,
          phone: org?.phone,
          email: org?.email,
          website: org?.website,
          reportFooter: org?.reportFooter,
        },
        inventory: {
          id: inventory.id,
          assetCode: inventory.assetCode,
          typeDescription: inventory.typeDescription,
          specificArea: inventory.specificArea,
          status: inventory.status,
          itemTypeName: inventory.itemType?.name ?? null,
          itemTypeAllowNA: inventory.itemType?.allowNA ?? false,
          areaName: inventory.area?.name ?? null,
          categoryName: inventory.category?.name ?? null,
        },
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          frequency: template.itemType.checklistFrequency,
        },
        period: {
          key: periodKey,
          label: this.periodEngine.periodLabel(frequency, periodKey),
          start: periodStart,
          end: periodEnd,
          offday,
        },
        session: session ? {
          id: session.id,
          name: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
        } : null,
        pics: inventory.picAssignments.map(pa => ({
          id: pa.user.id,
          name: pa.user.name,
          phone: pa.user.phone,
          email: pa.user.email,
        })),
        latestStatus,
      },
      questions: questionsData,
      answers,
      findings,
      statusSummary: {
        completed: latestStatus === 'done' ? 1 : 0,
        pending: latestStatus === 'pending' ? 1 : 0,
        late: latestStatus === 'late' ? 1 : 0,
        offday: latestStatus === 'offday' ? 1 : 0,
        future: latestStatus === 'future' ? 1 : 0,
      },
    };
  }

  /**
   * Delegates to the period engine so holiday overrides and the weekly working
   * day configuration are resolved the same way everywhere.
   */
  async isWorkingDay(date: Date): Promise<boolean> {
    return this.periodEngine.isWorkingDay(date);
  }
}
