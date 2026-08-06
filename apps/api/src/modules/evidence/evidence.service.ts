import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createEvidence(data: {
    fileName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    checklistLogId: number;
    inventoryId: number;
    uploadedById: number;
  }) {
    // Validate checklist log exists and belongs to the inventory
    const checklistLog = await this.prisma.checklistLog.findFirst({
      where: { id: data.checklistLogId, inventoryId: data.inventoryId },
    });

    if (!checklistLog) {
      throw new BadRequestException('Checklist log tidak ditemukan atau tidak sesuai dengan inventaris');
    }

    const evidence = await this.prisma.evidence.create({
      data: {
        fileName: data.fileName,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        checklistLogId: data.checklistLogId,
        inventoryId: data.inventoryId,
        uploadedById: data.uploadedById,
      },
    });

    await this.auditService.log(data.uploadedById, 'EVIDENCE_ADDED', 'Evidence', evidence.id, undefined, {
      inventoryId: data.inventoryId,
      checklistLogId: data.checklistLogId,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    });

    return evidence;
  }

  async getEvidence(id: number) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      include: {
        checklistLog: { select: { id: true, inventoryId: true, templateId: true, periodKey: true } },
        inventory: { select: { id: true, assetCode: true } },
      },
    });

    if (!evidence) throw new NotFoundException('Evidence tidak ditemukan');
    return evidence;
  }

  async deleteEvidence(id: number, actorId: number) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id } });
    if (!evidence) throw new NotFoundException('Evidence tidak ditemukan');

    await this.prisma.evidence.delete({ where: { id } });

    // Clean up the persisted file on disk (best-effort)
    try {
      const filePath = path.join(process.cwd(), 'storage', 'evidence', evidence.storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // File cleanup failure should not break deletion; DB row is already removed.
    }

    await this.auditService.log(actorId, 'EVIDENCE_DELETED', 'Evidence', id);
    return { id };
  }
}