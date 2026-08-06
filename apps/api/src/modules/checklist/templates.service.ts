import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CreateChecklistTemplateDto, UpdateChecklistTemplateDto, ReorderQuestionsDto, UpdateTemplateQuestionsDto, AssignTemplateSessionDto, AssignInventoryTemplateDto } from './dto/checklist.dto';

@Injectable()
export class ChecklistTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const templates = await this.prisma.checklistTemplate.findMany({
      include: {
        itemType: true,
        questions: { orderBy: { sortOrder: 'asc' } },
        templateSessions: { include: { session: true } },
        inventoryAssignments: { include: { inventory: true } },
      },
      orderBy: { name: 'asc' },
    });

    return templates.map(t => ({
      ...t,
      questionCount: t.questions.length,
      assignedInventoriesCount: t.inventoryAssignments.length,
      assignedSessions: t.templateSessions.map(ts => ts.session),
    }));
  }

  async getById(id: number) {
    const template = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        itemType: true,
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

    const template = await this.prisma.$transaction(async (tx) => {
      const newTemplate = await tx.checklistTemplate.create({
        data: {
          name: dto.name,
          description: dto.description,
          itemTypeId: dto.itemTypeId,
          questions: {
            create: dto.questions.map((q, index) => ({
              questionText: q.questionText,
              answerType: q.answerType,
              optionsJson: q.optionsJson,
              isRequired: q.isRequired,
              sortOrder: index,
            })),
          },
          templateSessions: dto.sessionIds ? {
            create: dto.sessionIds.map(sessionId => ({ sessionId }))
          } : undefined,
        },
      });

      // Verify sessions exist and are active
      if (dto.sessionIds && dto.sessionIds.length > 0) {
        const sessions = await tx.checklistSession.findMany({
          where: { id: { in: dto.sessionIds }, isActive: true },
        });
        if (sessions.length !== dto.sessionIds.length) {
          throw new BadRequestException('Beberapa sesi tidak valid atau tidak aktif');
        }
      }

      return newTemplate;
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

    await this.prisma.$transaction(async (tx) => {
      // Delete existing questions
      await tx.checklistQuestion.deleteMany({ where: { templateId: id } });

      // Create new questions
      await tx.checklistQuestion.createMany({
        data: dto.questions.map((q, index) => ({
          templateId: id,
          questionText: q.questionText,
          answerType: q.answerType,
          optionsJson: q.optionsJson,
          isRequired: q.isRequired,
          sortOrder: index,
        })),
      });
    });

    await this.auditService.log(actorId, 'CHECKLIST_QUESTION_CHANGED', 'ChecklistTemplate', id, undefined, null, { questionCount: dto.questions.length });
    return { id };
  }

  async reorderQuestions(id: number, dto: ReorderQuestionsDto, actorId: number) {
    const template = await this.prisma.checklistTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template tidak ditemukan');

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

    // Block delete if there are questions (they can be deleted but we want to be safe)
    // Actually, we should allow delete if no historical logs, even with questions
    // The questions will be cascade deleted

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