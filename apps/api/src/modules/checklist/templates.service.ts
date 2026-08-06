import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CreateChecklistTemplateDto, UpdateChecklistTemplateDto, ReorderQuestionsDto, UpdateTemplateQuestionsDto, AssignTemplateSessionDto, AssignInventoryTemplateDto, CreateQuestionDto } from './dto/checklist.dto';

@Injectable()
export class ChecklistTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Shared mapping so create and updateQuestions never drift apart. */
  private questionData(question: CreateQuestionDto, index: number) {
    return {
      questionText: question.questionText,
      answerType: question.answerType ?? 'radio',
      optionsJson: question.optionsJson,
      isRequired: question.isRequired ?? true,
      requirePhoto: question.requirePhoto ?? false,
      placeholder: question.placeholder,
      helpText: question.helpText,
      sortOrder: index,
    };
  }

  async list() {
    const templates = await this.prisma.checklistTemplate.findMany({
      include: {
        itemType: { include: { category: true } },
        questions: { orderBy: { sortOrder: 'asc' } },
        templateSessions: { include: { session: true } },
        _count: { select: { inventoryAssignments: true } },
      },
      orderBy: [{ itemType: { name: 'asc' } }, { name: 'asc' }],
    });

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      active: t.active,
      createdAt: t.createdAt,
      itemTypeId: t.itemTypeId,
      itemType: t.itemType,
      itemTypeName: t.itemType?.name ?? null,
      itemTypeCode: t.itemType?.code ?? null,
      categoryName: t.itemType?.category?.name ?? null,
      frequency: t.itemType?.checklistFrequency ?? null,
      allowNA: t.itemType?.allowNA ?? false,
      questions: t.questions,
      questionCount: t.questions.length,
      assignedInventoriesCount: t._count.inventoryAssignments,
      assignedSessions: t.templateSessions.map(ts => ts.session),
    }));
  }

  /**
   * Group templates by Jenis Item and surface item types that still have none,
   * which is what the Checklist Master screen renders.
   */
  async listGrouped() {
    const [templates, itemTypes] = await Promise.all([
      this.list(),
      this.prisma.assetItemType.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const byItemType = new Map<number, typeof templates>();
    for (const template of templates) {
      const list = byItemType.get(template.itemTypeId) ?? [];
      list.push(template);
      byItemType.set(template.itemTypeId, list);
    }

    const groups = itemTypes.map(itemType => ({
      itemTypeId: itemType.id,
      itemTypeName: itemType.name,
      itemTypeCode: itemType.code,
      categoryName: itemType.category?.name ?? null,
      frequency: itemType.checklistFrequency,
      allowNA: itemType.allowNA,
      templates: byItemType.get(itemType.id) ?? [],
    }));

    return {
      groups,
      missingCount: groups.filter(g => g.templates.length === 0).length,
      totalTemplates: templates.length,
    };
  }

  /**
   * Create an empty checklist master for every active Jenis Item that does not
   * have one yet. Idempotent: running it twice creates nothing the second time.
   */
  async provisionMissing(actorId: number) {
    const itemTypes = await this.prisma.assetItemType.findMany({
      where: { active: true },
      include: { templates: { select: { id: true } } },
      orderBy: { name: 'asc' },
    });

    const missing = itemTypes.filter(itemType => itemType.templates.length === 0);
    const created: Array<{ id: number; itemTypeId: number; name: string }> = [];

    for (const itemType of missing) {
      const template = await this.prisma.checklistTemplate.create({
        data: {
          itemTypeId: itemType.id,
          name: `Checklist ${itemType.name}`,
        },
      });
      created.push({ id: template.id, itemTypeId: itemType.id, name: template.name });
      await this.auditService.log(actorId, 'CHECKLIST_TEMPLATE_CREATED', 'ChecklistTemplate', template.id, undefined, null, { name: template.name, provisioned: true });
    }

    return { createdCount: created.length, created };
  }

  async getById(id: number) {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        itemType: { include: { category: true } },
        questions: { orderBy: { sortOrder: 'asc' } },
        templateSessions: { include: { session: true } },
        inventoryAssignments: { include: { inventory: true } },
      },
    });
    if (!template) throw new NotFoundException('Template tidak ditemukan');
    return template;
  }

  async create(dto: CreateChecklistTemplateDto, actorId: number) {
    const itemType = await this.prisma.assetItemType.findUnique({ where: { id: dto.itemTypeId } });
    if (!itemType) throw new NotFoundException('Jenis Item tidak ditemukan');

    // Verify sessions before opening the transaction so a bad payload cannot
    // leave a half-created template behind.
    if (dto.sessionIds && dto.sessionIds.length > 0) {
      const sessions = await this.prisma.checklistSession.findMany({
        where: { id: { in: dto.sessionIds }, isActive: true },
      });
      if (sessions.length !== dto.sessionIds.length) {
        throw new BadRequestException('Beberapa sesi tidak valid atau tidak aktif');
      }
    }

    const template = await this.prisma.$transaction(async (tx) => {
      return tx.checklistTemplate.create({
        data: {
          name: dto.name,
          description: dto.description,
          itemTypeId: dto.itemTypeId,
          questions: {
            create: dto.questions.map((q, index) => this.questionData(q, index)),
          },
          templateSessions: dto.sessionIds ? {
            create: dto.sessionIds.map(sessionId => ({ sessionId }))
          } : undefined,
        },
      });
    });

    await this.auditService.log(actorId, 'CHECKLIST_TEMPLATE_CREATED', 'ChecklistTemplate', template.id, undefined, null, { name: template.name });
    return template;
  }

  async update(id: number, dto: UpdateChecklistTemplateDto, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    const updated = await this.prisma.checklistTemplate.update({
      where: { id },
      data: {
        name: dto.name ?? template.name,
        description: dto.description ?? template.description,
        active: dto.active ?? template.active,
      },
    });

    await this.auditService.log(actorId, 'CHECKLIST_TEMPLATE_UPDATED', 'ChecklistTemplate', id, undefined, null, { name: updated.name });
    return updated;
  }

  async updateQuestions(id: number, dto: UpdateTemplateQuestionsDto, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    // Answered questions are referenced by checklist_logs; deleting them would
    // orphan history, so block the rewrite instead of corrupting the audit trail.
    const answeredCount = await this.prisma.checklistLog.count({
      where: { templateId: id, questionId: { not: null } },
    });
    if (answeredCount > 0) {
      throw new ConflictException(
        'Template ini sudah memiliki riwayat jawaban. Nonaktifkan template lalu buat yang baru bila pertanyaannya perlu diubah.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.checklistQuestion.deleteMany({ where: { templateId: id } });
      await tx.checklistQuestion.createMany({
        data: dto.questions.map((q, index) => ({
          templateId: id,
          ...this.questionData(q, index),
        })),
      });
    });

    await this.auditService.log(actorId, 'CHECKLIST_QUESTION_CHANGED', 'ChecklistTemplate', id, undefined, null, { questionCount: dto.questions.length });
    return { id };
  }

  async reorderQuestions(id: number, dto: ReorderQuestionsDto, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    // Only reorder questions that actually belong to this template.
    const owned = await this.prisma.checklistQuestion.findMany({
      where: { id: { in: dto.questionIds }, templateId: id },
      select: { id: true },
    });
    if (owned.length !== dto.questionIds.length) {
      throw new BadRequestException('Beberapa pertanyaan tidak dimiliki template ini');
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.questionIds.length; i++) {
        await tx.checklistQuestion.update({
          where: { id: dto.questionIds[i] },
          data: { sortOrder: i },
        });
      }
    });

    await this.auditService.log(actorId, 'CHECKLIST_QUESTION_CHANGED', 'ChecklistTemplate', id, undefined, null, { action: 'reorder' });
    return { id };
  }

  async updateSessions(id: number, dto: AssignTemplateSessionDto, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    // Verify sessions exist and are active
    if (dto.sessionIds && dto.sessionIds.length > 0) {
      const sessions = await this.prisma.checklistSession.findMany({
        where: { id: { in: dto.sessionIds }, isActive: true },
      });
      if (sessions.length !== dto.sessionIds.length) {
        throw new BadRequestException('Beberapa sesi tidak valid atau tidak aktif');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove existing template sessions
      await tx.checklistTemplateSession.deleteMany({ where: { templateId: id } });

      // Create new assignments
      if (dto.sessionIds && dto.sessionIds.length > 0) {
        await tx.checklistTemplateSession.createMany({
          data: dto.sessionIds.map(sessionId => ({ templateId: id, sessionId })),
        });
      }
    });

    await this.auditService.log(actorId, 'CHECKLIST_TEMPLATE_SESSION_CHANGED', 'ChecklistTemplate', id, undefined, null, { sessionIds: dto.sessionIds });
    return { id };
  }

  async assignInventories(dto: AssignInventoryTemplateDto, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id: dto.templateId } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    // Verify all inventories exist and have compatible item type
    const inventories = await this.prisma.complianceInventory.findMany({
      where: { id: { in: dto.inventoryIds } },
      include: { itemType: true },
    });

    if (inventories.length !== dto.inventoryIds.length) {
      throw new BadRequestException('Beberapa inventaris tidak ditemukan');
    }

    const incompatible = inventories.filter(inv => inv.itemTypeId !== template.itemTypeId);
    if (incompatible.length > 0) {
      throw new BadRequestException(`Inventaris ${incompatible.map(i => i.assetCode).join(', ')} memiliki jenis item yang tidak kompatibel dengan template ini`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove existing assignments for these inventories
      await tx.inventoryChecklistAssignment.deleteMany({
        where: { inventoryId: { in: dto.inventoryIds } },
      });

      // Create new assignments
      await tx.inventoryChecklistAssignment.createMany({
        data: dto.inventoryIds.map(inventoryId => ({
          inventoryId,
          templateId: dto.templateId,
        })),
      });
    });

    await this.auditService.log(actorId, 'INVENTORY_CHECKLIST_ASSIGNED', 'ChecklistTemplate', dto.templateId, undefined, null, { inventoryIds: dto.inventoryIds });
    return { templateId: dto.templateId };
  }

  async unassignInventories(templateId: number, inventoryIds: number[], actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

    await this.prisma.inventoryChecklistAssignment.deleteMany({
      where: { templateId, inventoryId: { in: inventoryIds } },
    });

    await this.auditService.log(actorId, 'INVENTORY_CHECKLIST_UNASSIGNED', 'ChecklistTemplate', templateId, undefined, null, { inventoryIds });
    return { templateId };
  }

  async remove(id: number, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        questions: true,
        inventoryAssignments: true,
        logs: true,
      },
    });

    if (!template) throw new NotFoundException('Template tidak ditemukan');

    // Block delete if there are historical checklist logs
    if (template.logs.length > 0) {
      throw new ConflictException('Template sudah memiliki riwayat checklist dan tidak dapat dihapus');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryChecklistAssignment.deleteMany({ where: { templateId: id } });
      await tx.checklistTemplateSession.deleteMany({ where: { templateId: id } });
      await tx.checklistQuestion.deleteMany({ where: { templateId: id } });
      await tx.checklistTemplate.delete({ where: { id } });
    });

    await this.auditService.log(actorId, 'CHECKLIST_TEMPLATE_DELETED', 'ChecklistTemplate', id, undefined, { name: template.name });
    return { id };
  }
}
