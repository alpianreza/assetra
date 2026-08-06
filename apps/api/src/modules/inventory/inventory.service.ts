import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CreateInventoryDto, UpdateInventoryDto, QueryInventoryDto, INVENTORY_STATUSES, InventoryStatus } from './inventory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
      qty: inventory.qty,
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

  async create(dto: CreateInventoryDto, actorId: number) {
    // Validate foreign keys
    const itemType = await this.prisma.assetItemType.findUnique({ where: { id: dto.itemTypeId } });
    if (!itemType) throw new NotFoundException('Jenis Item tidak ditemukan');

    const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
    if (!area) throw new NotFoundException('Area tidak ditemukan');

    // Check for unique assetCode
    const existing = await this.prisma.complianceInventory.findUnique({ where: { assetCode: dto.assetCode } });
    if (existing) throw new ConflictException('Nomor inventaris sudah digunakan');

    // Validate PIC users (must be active)
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

    const inventory = await this.prisma.$transaction(async (tx) => {
      const newInventory = await tx.complianceInventory.create({
        data: {
          assetCode: dto.assetCode,
          categoryId: itemType.categoryId, // Derived from itemType
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
      return newInventory;
    });

    await this.auditService.log(actorId, 'INVENTORY_CREATED', 'ComplianceInventory', inventory.id, undefined, null, { assetCode: inventory.assetCode });
    return { id: inventory.id, assetCode: inventory.assetCode };
  }

  async update(id: number, dto: UpdateInventoryDto, actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({ where: { id } });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    // Validate foreign keys if provided
    if (dto.itemTypeId) {
      const itemType = await this.prisma.assetItemType.findUnique({ where: { id: dto.itemTypeId } });
      if (!itemType) throw new NotFoundException('Jenis Item tidak ditemukan');
      dto.categoryId = itemType.categoryId; // Update derived category
    }
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({ where: { id: dto.areaId } });
      if (!area) throw new NotFoundException('Area tidak ditemukan');
    }

    // Check for unique assetCode if changed
    if (dto.assetCode && dto.assetCode !== inventory.assetCode) {
      const existing = await this.prisma.complianceInventory.findUnique({ where: { assetCode: dto.assetCode } });
      if (existing) throw new ConflictException('Nomor inventaris sudah digunakan');
    }

    // Validate new PIC users (must be active)
    const newPicUserIds = dto.picUserIds ?? null; // null means no change
    if (newPicUserIds !== null && newPicUserIds.length > 0) {
      const activeUsers = await this.prisma.user.findMany({
        where: { id: { in: newPicUserIds }, status: 'active' },
        select: { id: true },
      });
      if (activeUsers.length !== newPicUserIds.length) {
        throw new BadRequestException('Beberapa pengguna PIC tidak valid atau tidak aktif');
      }
    }

    const updatedInventory = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.complianceInventory.update({
        where: { id },
        data: {
          assetCode: dto.assetCode ?? inventory.assetCode,
          categoryId: dto.categoryId ?? inventory.categoryId,
          itemTypeId: dto.itemTypeId ?? inventory.itemTypeId,
          areaId: dto.areaId ?? inventory.areaId,
          specificArea: dto.specificArea ?? inventory.specificArea,
          typeDescription: dto.typeDescription ?? inventory.typeDescription,
          status: dto.status ?? inventory.status,
          remark: dto.remark ?? inventory.remark,
        },
      });

      // Sync PIC assignments if provided
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

    // Check for existing business relations before hard delete
    if (inventory.checklistLogs.length > 0) {
      throw new ConflictException('Inventaris memiliki riwayat checklist dan tidak dapat dihapus');
    }
    if (inventory.evidence.length > 0) {
      throw new ConflictException('Inventaris memiliki bukti terkait dan tidak dapat dihapus');
    }
    if (inventory.checklistTemplateAssignments.length > 0) {
        throw new ConflictException('Inventaris memiliki penugasan checklist dan tidak dapat dihapus');
    }

    await this.prisma.$transaction(async (tx) => {
      // Clean up PIC assignments
      await tx.inventoryPicAssignment.deleteMany({ where: { inventoryId: id } });
      await tx.complianceInventory.delete({ where: { id } });
    });


    await this.auditService.log(actorId, 'INVENTORY_DELETED', 'ComplianceInventory', id, undefined, { assetCode: inventory.assetCode });
    return { id };
  }
}
