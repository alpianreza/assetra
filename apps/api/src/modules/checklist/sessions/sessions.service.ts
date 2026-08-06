import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../auth/audit.service';
import { CreateSessionDto, UpdateSessionDto } from './dto/sessions.dto';

@Injectable()
export class ChecklistSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    return this.prisma.checklistSession.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getById(id: number) {
    const session = await this.prisma.checklistSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');
    return session;
  }

  async create(dto: CreateSessionDto, actorId: number) {
    const existing = await this.prisma.checklistSession.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Kode sesi sudah digunakan');

    const session = await this.prisma.checklistSession.create({
      data: {
        name: dto.name,
        code: dto.code,
        startTime: dto.startTime,
        endTime: dto.endTime,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log(actorId, 'CHECKLIST_SESSION_CREATED', 'ChecklistSession', session.id, undefined, null, { name: session.name });
    return session;
  }

  async update(id: number, dto: UpdateSessionDto, actorId: number) {
    const session = await this.prisma.checklistSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');

    const updated = await this.prisma.checklistSession.update({
      where: { id },
      data: {
        name: dto.name ?? session.name,
        startTime: dto.startTime ?? session.startTime,
        endTime: dto.endTime ?? session.endTime,
        sortOrder: dto.sortOrder ?? session.sortOrder,
        isActive: dto.isActive ?? session.isActive,
      },
    });

    await this.auditService.log(actorId, 'CHECKLIST_SESSION_UPDATED', 'ChecklistSession', id, undefined, null, { name: updated.name });
    return updated;
  }

  async remove(id: number, actorId: number) {
    const session = await this.prisma.checklistSession.findUnique({
      where: { id },
      include: {
        templateSessions: true,
        logs: true,
      },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');

    // Block delete if there are historical logs
    if (session.logs.length > 0) {
      throw new ConflictException('Sesi memiliki riwayat checklist dan tidak dapat dihapus');
    }

    // If there are template assignments, block destructive delete (require unassign first)
    if (session.templateSessions.length > 0) {
      throw new ConflictException('Sesi masih digunakan oleh template checklist. Lepaskan sesi dari template terlebih dahulu.');
    }

    await this.prisma.checklistSession.delete({ where: { id } });
    await this.auditService.log(actorId, 'CHECKLIST_SESSION_DELETED', 'ChecklistSession', id, undefined, { name: session.name });
    return { id };
  }
}