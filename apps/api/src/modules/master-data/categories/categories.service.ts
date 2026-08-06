import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../modules/auth/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const categories = await this.prisma.inventoryCategory.findMany({
      orderBy: { name: 'asc' },
      include: { itemTypes: true, inventories: true },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      code: cat.code,
      itemTypeCount: cat.itemTypes.length,
      inventoryCount: cat.inventories.length,
    }));
  }

  async getById(id: number) {
    const category = await this.prisma.inventoryCategory.findUnique({
      where: { id },
      include: { itemTypes: true, inventories: true },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    return {
      id: category.id,
      name: category.name,
      code: category.code,
      itemTypeCount: category.itemTypes.length,
      inventoryCount: category.inventories.length,
    };
  }

  async create(dto: CreateCategoryDto, actorId: number) {
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new ConflictException('Nama atau kode kategori sudah digunakan');

    const category = await this.prisma.inventoryCategory.create({
      data: {
        name: dto.name,
        code: dto.code,
      },
    });

    await this.auditService.log(actorId, 'CATEGORY_CREATED', 'InventoryCategory', category.id, undefined, null, { name: category.name });
    return { id: category.id, name: category.name, code: category.code };
  }

  async update(id: number, dto: UpdateCategoryDto, actorId: number) {
    const category = await this.prisma.inventoryCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    if (dto.name || dto.code) {
      const dup = await this.prisma.inventoryCategory.findFirst({
        where: {
          OR: [...(dto.name ? [{ name: dto.name }] : []), ...(dto.code ? [{ code: dto.code }] : [])],
          NOT: { id },
        },
      });
      if (dup) throw new ConflictException('Nama atau kode kategori sudah digunakan');
    }

    const updated = await this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        name: dto.name ?? category.name,
        code: dto.code ?? category.code,
      },
    });

    await this.auditService.log(actorId, 'CATEGORY_UPDATED', 'InventoryCategory', id, undefined, null, {
      name: updated.name,
    });

    return { id: updated.id, name: updated.name, code: updated.code };
  }

  async remove(id: number, actorId: number) {
    const category = await this.prisma.inventoryCategory.findUnique({
      where: { id },
      include: { itemTypes: true, inventories: true },
    });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    if (category.itemTypes.length > 0 || category.inventories.length > 0) {
      throw new ConflictException('Kategori masih digunakan dan tidak dapat dihapus');
    }

    await this.prisma.inventoryCategory.delete({ where: { id } });
    await this.auditService.log(actorId, 'CATEGORY_DELETED', 'InventoryCategory', id, undefined, null, {
      name: category.name,
    });

    return { id };
  }
}