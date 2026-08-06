import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CreateInventoryDto, UpdateInventoryDto, QueryInventoryDto, INVENTORY_STATUSES, InventoryStatus } from './inventory.dto';
import { Prisma } from '@prisma/client';

/** Retries when two people create an inventory of the same type at once. */
const ASSET_CODE_MAX_ATTEMPTS = 5;

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Inventory checklists are derived from Jenis Item. Keep the legacy
   * assignment table synchronized automatically so users never need to assign
   * a checklist manually after creating an inventory.
   */
  async onModuleInit() {
    const templates = await this.prisma.checklistTemplate.findMany({
      where: {
        active: true,
        questions: { some: { active: true } },
      },
      select: { id: true, itemTypeId: true },
    });

    for (const template of templates) {
      const inventories = await this.prisma.complianceInventory.findMany({
        where: { itemTypeId: template.itemTypeId },
        select: { id: true },
      });
      if (inventories.length === 0) continue;

      await this.prisma.inventoryChecklistAssignment.createMany({
        data: inventories.map(inventory => ({
          inventoryId: inventory.id,
          templateId: template.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async activeTemplateIds(itemTypeId: number): Promise<number[]> {
    const templates = await this.prisma.checklistTemplate.findMany({
      where: {
        itemTypeId,
        active: true,
        questions: { some: { active: true } },
      },
      select: { id: true },
    });
    return templates.map(template => template.id);
  }

  async list(query: QueryInventoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ComplianceInventoryWhereInput = {};

    if (query.search) {
      where.OR = [
        { assetCode: { contains: query.search } },
        { typeDescription: { contains: query.search } },
        { specificArea: { contains: query.search } },
        { remark: { contains: query.search } },
      ];
    }
    if (query.itemTypeId) {
      where.itemTypeId = query.itemTypeId;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.areaId) {
      where.areaId = query.areaId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.picId) {
      where.picAssignments = {
        some: {
          userId: query.picId,
        },
      };
    }

    const [total, inventories] = await Promise.all([
      this.prisma.complianceInventory.count({ where }),
      this.prisma.complianceInventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { assetCode: 'asc' },
        include: {
          category: true,
          area: true,
          itemType: true,
          picAssignments: {
            include: {
              user: true,
            },
          },
        },
      }),
    ]);

    return {
      items: inventories.map((inv) => ({
        id: inv.id,
        assetCode: inv.assetCode,
        typeDescription: inv.typeDescription ?? null,
        specificArea: inv.specificArea ?? null,
        status: inv.status ?? 'unknown',
        category: inv.category.name,
        area: inv.area?.name ?? null,
        itemType: inv.itemType?.name ?? null,
        picUsers: inv.picAssignments.map((pa) => ({
          id: pa.user.id,
          name: pa.user.name,
          status: pa.user.status,
        })),
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id },
      include: {
        category: true,
        area: true,
        itemType: true,
        picAssignments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    return {
      id: inventory.id,
      assetCode: inventory.assetCode,
      typeDescription: inventory.typeDescription ?? null,
      specificArea: inventory.specificArea ?? null,
      status: inventory.status ?? 'unknown',
      remark: inventory.remark ?? null,
      qrImage: inventory.qrImage,
      photo: inventory.photo,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      categoryId: inventory.categoryId,
      categoryName: inventory.category.name,
      areaId: inventory.areaId ?? null,
      areaName: inventory.area?.name ?? null,
      itemTypeId: inventory.itemTypeId ?? null,
      itemTypeName: inventory.itemType?.name ?? null,
      picUsers: inventory.picAssignments.map((pa) => ({
        id: pa.user.id,
        name: pa.user.name,
        status: pa.user.status,
      })),
    };
  }

  // ------------------------------------------------------------------
  // Asset code generation (KODEKATEGORI-KODEITEM-NOURUT)
  // ------------------------------------------------------------------

  async previewNextAssetCode(itemTypeId: number) {
    const itemType = await this.prisma.assetItemType.findUnique({
      where: { id: itemTypeId },
      include: { category: true },
    });
    if (!itemType) throw new NotFoundException('Jenis Item tidak ditemukan');

    const assetCode = await this.generateAssetCode(itemType.category.code, itemType.code);
    return {
      assetCode,
      categoryId: itemType.categoryId,
      categoryCode: itemType.category.code,
      itemTypeCode: itemType.code,
    };
  }

  private async generateAssetCode(categoryCode: string, itemTypeCode: string): Promise<string> {
    const prefix = `${categoryCode.trim().toUpperCase()}-${itemTypeCode.trim().toUpperCase()}`;

    const existing = await this.prisma.complianceInventory.findMany({
      where: { assetCode: { startsWith: `${prefix}-` } },
      select: { assetCode: true },
    });

    let highest = 0;
    for (const row of existing) {
      const matched = /-(\d+)$/.exec(row.assetCode);
      if (!matched) continue;
      const value = Number.parseInt(matched[1], 10);
      if (Number.isFinite(value) && value > highest) highest = value;
    }

    return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
  }

  async create(dto: CreateInventoryDto, actorId: number) {
    const itemType = await this.prisma.assetItemType.findUnique({
      where: { id: dto.itemTypeId },
      include: { category: true },
    });
    if (!itemType) throw new NotFoundException('Jenis Item tidak ditemukan');

    const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
    if (!area) throw new NotFoundException('Area tidak ditemukan');

    const picUserIds = dto.picUserIds ?? [];
    if (picUserIds.length > 0) {
      const activeUsers = await this.prisma.user.findMany({
        where: { id: { in: picUserIds }, status: 'active' },
        select: { id: true },
      });
      if (activeUsers.length !== picUserIds.length) {
        throw new BadRequestException('Beberapa pengguna PIC tidak valid atau tidak aktif');
      }
    }

    const templateIds = await this.activeTemplateIds(dto.itemTypeId);
    let inventory: { id: number; assetCode: string } | null = null;

    for (let attempt = 1; attempt <= ASSET_CODE_MAX_ATTEMPTS; attempt++) {
      const assetCode = await this.generateAssetCode(itemType.category.code, itemType.code);

      try {
        inventory = await this.prisma.$transaction(async (tx) => {
          const newInventory = await tx.complianceInventory.create({
            data: {
              assetCode,
              categoryId: itemType.categoryId,
              itemTypeId: dto.itemTypeId,
              areaId: dto.areaId,
              specificArea: dto.specificArea,
              typeDescription: dto.typeDescription,
              status: dto.status,
              remark: dto.remark,
            },
          });

          if (picUserIds.length > 0) {
            await tx.inventoryPicAssignment.createMany({
              data: picUserIds.map((userId) => ({
                inventoryId: newInventory.id,
                userId,
              })),
            });
          }

          if (templateIds.length > 0) {
            await tx.inventoryChecklistAssignment.createMany({
              data: templateIds.map(templateId => ({
                inventoryId: newInventory.id,
                templateId,
              })),
              skipDuplicates: true,
            });
          }

          return { id: newInventory.id, assetCode: newInventory.assetCode };
        });
        break;
      } catch (error) {
        const isDuplicate =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (isDuplicate && attempt < ASSET_CODE_MAX_ATTEMPTS) continue;
        if (isDuplicate) {
          throw new ConflictException('Gagal membuat nomor inventaris unik, silakan coba lagi');
        }
        throw error;
      }
    }

    if (!inventory) {
      throw new ConflictException('Gagal membuat nomor inventaris unik, silakan coba lagi');
    }

    await this.auditService.log(actorId, 'INVENTORY_CREATED', 'ComplianceInventory', inventory.id, undefined, null, { assetCode: inventory.assetCode });
    return { id: inventory.id, assetCode: inventory.assetCode };
  }

  async update(id: number, dto: UpdateInventoryDto, actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({ where: { id } });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    let categoryId = inventory.categoryId;
    if (dto.itemTypeId) {
      const itemType = await this.prisma.assetItemType.findUnique({ where: { id: dto.itemTypeId } });
      if (!itemType) throw new NotFoundException('Jenis Item tidak ditemukan');
      categoryId = itemType.categoryId;
    }
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) throw new NotFoundException('Area tidak ditemukan');
    }

    const newPicUserIds = dto.picUserIds ?? null;
    if (newPicUserIds !== null && newPicUserIds.length > 0) {
      const activeUsers = await this.prisma.user.findMany({
        where: { id: { in: newPicUserIds }, status: 'active' },
        select: { id: true },
      });
      if (activeUsers.length !== newPicUserIds.length) {
        throw new BadRequestException('Beberapa pengguna PIC tidak valid atau tidak aktif');
      }
    }

    const nextItemTypeId = dto.itemTypeId ?? inventory.itemTypeId;
    const itemTypeChanged = nextItemTypeId != null && nextItemTypeId !== inventory.itemTypeId;
    const templateIds = itemTypeChanged ? await this.activeTemplateIds(nextItemTypeId) : [];

    const updatedInventory = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.complianceInventory.update({
        where: { id },
        data: {
          categoryId,
          itemTypeId: nextItemTypeId,
          areaId: dto.areaId ?? inventory.areaId,
          specificArea: dto.specificArea ?? inventory.specificArea,
          typeDescription: dto.typeDescription ?? inventory.typeDescription,
          status: dto.status ?? inventory.status,
          remark: dto.remark ?? inventory.remark,
        },
      });

      if (itemTypeChanged) {
        await tx.inventoryChecklistAssignment.deleteMany({ where: { inventoryId: id } });
        if (templateIds.length > 0) {
          await tx.inventoryChecklistAssignment.createMany({
            data: templateIds.map(templateId => ({ inventoryId: id, templateId })),
            skipDuplicates: true,
          });
        }
      }

      if (newPicUserIds !== null) {
        const existingAssignments = await tx.inventoryPicAssignment.findMany({
          where: { inventoryId: id },
          select: { userId: true },
        });
        const existingPicUserIds = new Set(existingAssignments.map((a) => a.userId));
        const newPicUserIdsSet = new Set(newPicUserIds);

        const toAdd = newPicUserIds.filter((userId) => !existingPicUserIds.has(userId));
        const toRemove = existingAssignments.filter((a) => !newPicUserIdsSet.has(a.userId)).map((a) => a.userId);

        if (toRemove.length > 0) {
          await tx.inventoryPicAssignment.deleteMany({
            where: {
              inventoryId: id,
              userId: { in: toRemove },
            },
          });
        }
        if (toAdd.length > 0) {
          await tx.inventoryPicAssignment.createMany({
            data: toAdd.map((userId) => ({
              inventoryId: id,
              userId,
            })),
          });
        }
        if (toAdd.length > 0 || toRemove.length > 0) {
          await this.auditService.log(actorId, 'INVENTORY_PIC_CHANGED', 'ComplianceInventory', id);
        }
      }
      return updated;
    });

    await this.auditService.log(actorId, 'INVENTORY_UPDATED', 'ComplianceInventory', id, undefined, null, { assetCode: updatedInventory.assetCode });
    return { id: updatedInventory.id, assetCode: updatedInventory.assetCode };
  }

  async updateStatus(id: number, status: InventoryStatus, actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({ where: { id } });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    if (!INVENTORY_STATUSES.includes(status)) {
      throw new BadRequestException('Status inventaris tidak valid');
    }

    const updated = await this.prisma.complianceInventory.update({
      where: { id },
      data: { status },
    });

    await this.auditService.log(actorId, 'INVENTORY_STATUS_CHANGED', 'ComplianceInventory', id, undefined, { oldStatus: inventory.status }, { newStatus: updated.status });
    return { id: updated.id, status: updated.status };
  }

  async remove(id: number, actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id },
      include: {
        checklistLogs: true,
        evidence: true,
        checklistTemplateAssignments: true,
      },
    });

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    if (inventory.checklistLogs.length > 0) {
      throw new ConflictException('Inventaris memiliki riwayat checklist dan tidak dapat dihapus');
    }
    if (inventory.evidence.length > 0) {
      throw new ConflictException('Inventaris memiliki bukti terkait dan tidak dapat dihapus');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryChecklistAssignment.deleteMany({ where: { inventoryId: id } });
      await tx.inventoryPicAssignment.deleteMany({ where: { inventoryId: id } });
      await tx.complianceInventory.delete({ where: { id } });
    });

    await this.auditService.log(actorId, 'INVENTORY_DELETED', 'ComplianceInventory', id, undefined, { assetCode: inventory.assetCode });
    return { id };
  }
}
