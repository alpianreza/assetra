import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../modules/auth/audit.service';
import { CreateAreaDto, UpdateAreaDto } from './areas.dto';

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const areas = await this.prisma.area.findMany({
      orderBy: { name: 'asc' },
      include: {
        inventories: true,
      },
    });

    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      locationDetail: area.locationDetail ?? null,
      inventoryCount: area.inventories.length,
    }));
  }

  async getById(id: number) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: {
        inventories: true,
      },
    });
    if (!area) throw new NotFoundException('Area tidak ditemukan');

    return {
      id: area.id,
      name: area.name,
      locationDetail: area.locationDetail ?? null,
      inventoryCount: area.inventories.length,
    };
  }

  async create(dto: CreateAreaDto, actorId: number) {
    const existing = await this.prisma.area.findFirst({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Area dengan nama ini sudah ada');

    const area = await this.prisma.area.create({
      data: {
        name: dto.name,
        locationDetail: dto.locationDetail ?? null,
      },
    });

    await this.auditService.log(actorId, 'AREA_CREATED', 'Area', area.id, undefined, null, { name: area.name });
    return { id: area.id, name: area.name, locationDetail: area.locationDetail };
  }

  async update(id: number, dto: UpdateAreaDto, actorId: number) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) throw new NotFoundException('Area tidak ditemukan');

    if (dto.name !== undefined) {
      const existing = await this.prisma.area.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) throw new ConflictException('Area dengan nama ini sudah ada');
    }

    const updated = await this.prisma.area.update({
      where: { id },
      data: {
        name: dto.name ?? area.name,
        locationDetail: dto.locationDetail !== undefined ? dto.locationDetail : area.locationDetail,
      },
    });

    await this.auditService.log(actorId, 'AREA_UPDATED', 'Area', id, undefined, null, {
      name: updated.name,
    });

    return { id: updated.id, name: updated.name, locationDetail: updated.locationDetail };
  }

  async remove(id: number, actorId: number) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: { inventories: true },
    });
    if (!area) throw new NotFoundException('Area tidak ditemukan');

    if (area.inventories.length > 0) {
      throw new ConflictException('Area masih memiliki inventaris dan tidak dapat dihapus');
    }

    await this.prisma.area.delete({ where: { id } });
    await this.auditService.log(actorId, 'AREA_DELETED', 'Area', id, undefined, null, {
      name: area.name,
    });

    return { id };
  }
}