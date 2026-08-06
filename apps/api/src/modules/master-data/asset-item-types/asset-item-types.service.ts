import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../modules/auth/audit.service';
import { CreateAssetItemTypeDto, UpdateAssetItemTypeDto } from './asset-item-types.dto';

@Injectable()
export class AssetItemTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const types = await this.prisma.assetItemType.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: true,
        inventories: true,
        templates: true,
      },
    });

    return types.map((type) => ({
      id: type.id,
      name: type.name,
      code: type.code,
      categoryName: type.category.name,
      checklistFrequency: type.checklistFrequency,
      active: type.active,
      inventoryCount: type.inventories.length,
    }));
  }

  async getById(id: number) {
    const type = await this.prisma.assetItemType.findUnique({
      where: { id },
      include: { category: true, inventories: true },
    });
    if (!type) throw new NotFoundException('Jenis item tidak ditemukan');

    return {
      id: type.id,
      categoryId: type.categoryId,
      name: type.name,
      code: type.code,
      checklistFrequency: type.checklistFrequency,
      active: type.active,
      inventoryCount: type.inventories.length,
    };
  }

  async create(dto: CreateAssetItemTypeDto, actorId: number) {
    const category = await this.prisma.inventoryCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    const assetItemType = await this.prisma.assetItemType.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        code: dto.code,
        checklistFrequency: dto.checklistFrequency,
      },
    });

    await this.auditService.log(actorId, 'ITEM_TYPE_CREATED', 'AssetItemType', assetItemType.id, undefined, null, { name: assetItemType.name });
    return assetItemType;
  }

  async update(id: number, dto: UpdateAssetItemTypeDto, actorId: number) {
    const type = await this.prisma.assetItemType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('Jenis item tidak ditemukan');

    if (dto.categoryId) {
        const category = await this.prisma.inventoryCategory.findUnique({ where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    }

    const updated = await this.prisma.assetItemType.update({
      where: { id },
      data: {
        categoryId: dto.categoryId ?? type.categoryId,
        name: dto.name ?? type.name,
        code: dto.code ?? type.code,
        checklistFrequency: dto.checklistFrequency ?? type.checklistFrequency,
        active: dto.active !== undefined ? dto.active : type.active,
      },
    });

    await this.auditService.log(actorId, 'ITEM_TYPE_UPDATED', 'AssetItemType', id, undefined, null, { name: updated.name });
    return updated;
  }

  async remove(id: number, actorId: number) {
    const type = await this.prisma.assetItemType.findUnique({
      where: { id },
      include: { inventories: true, templates: true },
    });
    if (!type) throw new NotFoundException('Jenis item tidak ditemukan');

    if (type.inventories.length > 0 || type.templates.length > 0) {
      throw new ConflictException('Jenis item masih digunakan dan tidak dapat dihapus');
    }

    await this.prisma.assetItemType.delete({ where: { id } });
    await this.auditService.log(actorId, 'ITEM_TYPE_DELETED', 'AssetItemType', id, undefined, null, { name: type.name });
    return { id };
  }
}
