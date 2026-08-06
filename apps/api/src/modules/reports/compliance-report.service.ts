import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { BrandingService } from '../branding/branding.service';
import { CompliancePeriodEngine, ComplianceFrequency } from '../compliance/period-engine.service';
import { ComplianceService } from '../compliance/compliance.service';

@Injectable()
export class ComplianceReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly brandingService: BrandingService,
    private readonly periodEngine: CompliancePeriodEngine,
    private readonly complianceService: ComplianceService,
  ) {}

  private readonly STATUS_LABELS = {
    ok: '✓',
    not_ok: '✗',
    na: '–',
  } as const;

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

    // Validate period (future check)
    const periodStart = this.periodEngine.periodStart(frequency, periodKey, inventory.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (periodStart > today) {
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
      return {
        questionId: q.id,
        questionText: q.questionText,
        status: log?.status || null,
        remark: log?.remark ?? null,
        photo: log?.photo ?? null,
        evidence: log?.evidence ?? [],
        answerType: q.answerType,
        optionsJson: q.optionsJson,
      };
    });

    // Determine overall status for this occurrence
    const isFuture = periodStart > today;
    const offday = !await this.isWorkingDay(periodStart);

    let latestStatus: any = 'Belum Diperiksa';
    if (isFuture) latestStatus = 'future';
    else if (offday) latestStatus = 'offday';
    else if (existingLogs.length > 0) latestStatus = 'completed';
    else {
      const late = this.isPeriodLate(frequency, periodStart);
      latestStatus = late ? 'late' : 'pending';
    }

    // Build findings
    const findings = {
      notOkCount: answers.filter(a => a.status === 'not_ok').length,
      naCount: answers.filter(a => a.status === 'na').length,
      okCount: answers.filter(a => a.status === 'ok').length,
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
          label: periodKey,
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
        completed: 0,
        pending: 0,
        late: 0,
        offday: 0,
        future: 0,
      },
    };
  }

  async isWorkingDay(date: Date): Promise<boolean> {
    const override = await this.prisma.holidayOverride.findUnique({ where: { date } });
    if (override) return override.status === 'WORKING';
    const dayOfWeek = date.getDay();
    const config = await this.prisma.workingDayConfiguration.findUnique({ where: { dayOfWeek } });
    return config?.status === 'WORKING';
  }

  private isPeriodLate(frequency: ComplianceFrequency, periodStart: Date, now: Date = new Date()): boolean {
    const thresholds = { daily: 21, weekly: 28, monthly: 90 };
    const threshold = thresholds[frequency];
    const elapsedDays = Math.floor((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    return elapsedDays > threshold;
  }
}