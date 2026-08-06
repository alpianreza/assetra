import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(userId: number | null, action: string, entityType?: string, entityId?: number, ipAddress?: string, beforeData?: any, afterData?: any) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        beforeData,
        afterData,
        ipAddress,
      },
    });
  }
}
