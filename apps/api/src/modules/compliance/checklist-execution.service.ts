import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistLogStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { ComplianceFrequency, CompliancePeriodEngine } from './period-engine.service';

const ANSWER_STATUSES = ['ok', 'not_ok', 'na'] as const;

type SubmittedAnswer = {
  questionId: number;
  status: ChecklistLogStatus;
  remark?: string;
  photo?: string;
};

@Injectable()
export class ChecklistExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly periodEngine: CompliancePeriodEngine,
  ) {}

  private async loadContext(inventoryId: number, templateId: number) {
    const [inventory, template, assignment] = await Promise.all([
      this.prisma.complianceInventory.findUnique({
        where: { id: inventoryId },
        include: { itemType: true },
      }),
      this.prisma.checklistTemplate.findUnique({
        where: { id: templateId },
        include: {
          itemType: true,
          questions: {
            where: { active: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.inventoryChecklistAssignment.findUnique({
        where: { inventoryId_templateId: { inventoryId, templateId } },
      }),
    ]);

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');
    if (!template) throw new NotFoundException('Pertanyaan checklist tidak ditemukan');
    if (!assignment) throw new BadRequestException('Checklist belum terpasang pada inventaris ini');
    if (inventory.itemTypeId !== template.itemTypeId) {
      throw new BadRequestException('Jenis item inventaris tidak sesuai dengan pertanyaan checklist');
    }

    const rawFrequency = template.itemType.checklistFrequency as ComplianceFrequency;
    const frequency: ComplianceFrequency = this.periodEngine.isFrequency(rawFrequency) ? rawFrequency : 'monthly';
    return { inventory, template, frequency };
  }

  private async assertPeriodOpen(frequency: ComplianceFrequency, periodKey: string) {
    if (!this.periodEngine.isValidPeriodKey(frequency, periodKey)) {
      throw new BadRequestException(`Periode "${periodKey}" tidak valid`);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (this.periodEngine.isPeriodFuture(frequency, periodKey, today)) {
      throw new BadRequestException('Checklist periode masa depan belum dapat diisi');
    }
    if (await this.periodEngine.isOffdayPeriodAsync(frequency, periodKey)) {
      throw new BadRequestException('Checklist tidak dapat diisi pada hari libur');
    }
    if (!this.periodEngine.isPeriodEditable(frequency, periodKey, today)) {
      throw new BadRequestException('Periode sudah melewati batas pengisian');
    }
  }

  private async resolveSession(templateId: number, sessionId: number | null) {
    const templateSessions = await this.prisma.checklistTemplateSession.findMany({
      where: { templateId },
      include: { session: true },
      orderBy: { session: { sortOrder: 'asc' } },
    });

    if (templateSessions.length === 0) {
      if (sessionId != null) throw new BadRequestException('Checklist ini tidak menggunakan sesi');
      return null;
    }
    if (sessionId == null) throw new BadRequestException('Pilih sesi checklist terlebih dahulu');

    const selected = templateSessions.find(item => item.sessionId === sessionId);
    if (!selected || !selected.session.isActive) {
      throw new BadRequestException('Sesi checklist tidak valid atau tidak aktif');
    }
    return selected.session;
  }

  async buildExecution(
    inventoryId: number,
    templateId: number,
    periodKey: string,
    sessionId: number | null,
  ) {
    const { inventory, template, frequency } = await this.loadContext(inventoryId, templateId);
    await this.assertPeriodOpen(frequency, periodKey);
    const session = await this.resolveSession(templateId, sessionId);

    const existingHeader = await this.prisma.checklistLog.findFirst({
      where: { inventoryId, templateId, periodKey, sessionId: sessionId ?? null, questionId: null },
    });
    if (existingHeader) {
      throw new BadRequestException('Checklist untuk periode ini sudah diisi');
    }

    const existingLogs = await this.prisma.checklistLog.findMany({
      where: {
        inventoryId,
        templateId,
        periodKey,
        sessionId: sessionId ?? null,
        questionId: { not: null },
      },
    });
    const existingByQuestion = new Map(
      existingLogs
        .filter(log => log.questionId != null)
        .map(log => [log.questionId as number, log]),
    );
    const allowNA = await this.periodEngine.resolveAllowNA(inventory.itemTypeId);

    return {
      inventory: {
        id: inventory.id,
        assetCode: inventory.assetCode,
        itemTypeId: inventory.itemTypeId,
        itemTypeName: inventory.itemType?.name ?? null,
      },
      template: { id: template.id, frequency },
      period: {
        key: periodKey,
        label: this.periodEngine.periodLabel(frequency, periodKey),
      },
      session: session ? { id: session.id, name: session.name, code: session.code } : null,
      allowNA,
      questions: template.questions.map(question => {
        const existing = existingByQuestion.get(question.id);
        return {
          id: question.id,
          questionText: question.questionText,
          answerType: question.answerType,
          isRequired: question.isRequired,
          requirePhoto: question.requirePhoto,
          sortOrder: question.sortOrder,
          existingAnswer: existing?.status ?? null,
          existingRemark: existing?.remark ?? null,
          existingPhoto: existing?.photo ?? null,
        };
      }),
    };
  }

  async submit(
    inventoryId: number,
    templateId: number,
    periodKey: string,
    sessionId: number | null,
    answers: SubmittedAnswer[],
    actorId: number,
  ) {
    const { inventory, template, frequency } = await this.loadContext(inventoryId, templateId);
    await this.assertPeriodOpen(frequency, periodKey);
    await this.resolveSession(templateId, sessionId);

    const existingHeader = await this.prisma.checklistLog.findFirst({
      where: { inventoryId, templateId, periodKey, sessionId: sessionId ?? null, questionId: null },
    });
    if (existingHeader) throw new BadRequestException('Checklist untuk periode ini sudah diisi');

    const questionById = new Map(template.questions.map(question => [question.id, question]));
    const answerIds = answers.map(answer => answer.questionId);
    const uniqueIds = new Set(answerIds);
    if (uniqueIds.size !== answers.length) throw new BadRequestException('Terdapat jawaban pertanyaan yang duplikat');
    if (answers.length !== template.questions.length || answers.some(answer => !questionById.has(answer.questionId))) {
      throw new BadRequestException('Semua pertanyaan checklist wajib diisi');
    }

    const allowNA = await this.periodEngine.resolveAllowNA(inventory.itemTypeId);
    for (const answer of answers) {
      if (!ANSWER_STATUSES.includes(answer.status as any)) {
        throw new BadRequestException(`Status "${answer.status}" tidak valid`);
      }
      if (!allowNA && answer.status === 'na') {
        throw new BadRequestException('Status N/A tidak diizinkan untuk jenis item ini');
      }

      const question = questionById.get(answer.questionId)!;
      const remark = answer.remark?.trim() ?? '';
      const hasPhoto = Boolean(answer.photo);
      if (answer.status === 'not_ok' && !remark && !hasPhoto) {
        throw new BadRequestException(`Pertanyaan "${question.questionText}" yang Tidak Sesuai wajib memiliki catatan atau foto`);
      }
      if (question.requirePhoto && !hasPhoto) {
        throw new BadRequestException(`Pertanyaan "${question.questionText}" wajib memiliki foto`);
      }
    }

    const checkDate = new Date();
    const periodLabel = this.periodEngine.periodLabel(frequency, periodKey);
    const aggregateStatus: ChecklistLogStatus = answers.some(answer => answer.status === 'not_ok')
      ? 'not_ok'
      : answers.every(answer => answer.status === 'na')
        ? 'na'
        : 'ok';
    const occKey = this.periodEngine.occurrenceKey(inventoryId, templateId, periodKey, sessionId);

    const header = await this.prisma.$transaction(async tx => {
      const createdHeader = await tx.checklistLog.create({
        data: {
          inventoryId,
          templateId,
          sessionId: sessionId ?? null,
          checkDate,
          periodKey,
          periodLabel,
          status: aggregateStatus,
          checkedById: actorId,
          questionId: null,
        },
      });

      for (const answer of answers) {
        await tx.checklistLog.create({
          data: {
            inventoryId,
            templateId,
            questionId: answer.questionId,
            sessionId: sessionId ?? null,
            checkDate,
            periodKey,
            periodLabel,
            status: answer.status,
            remark: answer.remark?.trim() || null,
            photo: answer.photo ?? null,
            checkedById: actorId,
          },
        });
      }
      return createdHeader;
    });

    await this.auditService.log(
      actorId,
      'CHECKLIST_SUBMITTED',
      'ChecklistLog',
      header.id,
      undefined,
      null,
      { inventoryId, templateId, periodKey, sessionId, occKey, answerCount: answers.length },
    );
    return { occurrenceId: header.id, occKey };
  }
}
