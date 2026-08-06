import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/** Read-only projection used by auditors and result screens. */
@Injectable()
export class ComplianceResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getResult(inventoryId: number, occurrenceId: number) {
    const header = await this.prisma.checklistLog.findFirst({
      where: { id: occurrenceId, inventoryId, questionId: null },
      include: { template: true, session: true },
    });
    if (!header) throw new NotFoundException('Hasil checklist tidak ditemukan');

    const [inventory, answerLogs, checker] = await Promise.all([
      this.prisma.complianceInventory.findUnique({
        where: { id: inventoryId },
        include: { itemType: true, area: true },
      }),
      this.prisma.checklistLog.findMany({
        where: {
          inventoryId,
          templateId: header.templateId,
          periodKey: header.periodKey,
          sessionId: header.sessionId ?? null,
          questionId: { not: null },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: header.checkedById },
        select: { id: true, name: true },
      }),
    ]);

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const questionIds = answerLogs
      .map(log => log.questionId)
      .filter((id): id is number => id !== null);
    const questions = questionIds.length > 0
      ? await this.prisma.checklistQuestion.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, questionText: true, sortOrder: true },
        })
      : [];
    const questionById = new Map(questions.map(question => [question.id, question]));

    const answers = answerLogs
      .map(log => {
        const question = log.questionId ? questionById.get(log.questionId) : null;
        return {
          id: log.id,
          questionId: log.questionId,
          questionText: question?.questionText ?? 'Pertanyaan tidak tersedia',
          sortOrder: question?.sortOrder ?? Number.MAX_SAFE_INTEGER,
          status: log.status,
          remark: log.remark,
          photo: log.photo,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      occurrenceId: header.id,
      inventory: {
        id: inventory.id,
        assetCode: inventory.assetCode,
        itemTypeName: inventory.itemType?.name ?? null,
        areaName: inventory.area?.name ?? null,
        specificArea: inventory.specificArea,
      },
      template: { id: header.template.id, name: header.template.name },
      period: { key: header.periodKey, label: header.periodLabel ?? header.periodKey },
      session: header.session ? { id: header.session.id, name: header.session.name } : null,
      checkedAt: header.checkDate,
      checkedBy: checker,
      status: header.status,
      summary: {
        total: answers.length,
        ok: answers.filter(answer => answer.status === 'ok').length,
        notOk: answers.filter(answer => answer.status === 'not_ok').length,
        na: answers.filter(answer => answer.status === 'na').length,
      },
      answers,
    };
  }
}
