import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class ComplianceEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async persistUploadedFiles(input: { inventoryId: number; templateId: number; periodKey: string; sessionId: number | null; files: Express.Multer.File[]; actorId: number }) {
    const files = input.files.filter(file => /^photo_(\d+)$/.test(file.fieldname));
    if (!files.length) return [];
    const questionIds = files.map(file => Number(/^photo_(\d+)$/.exec(file.fieldname)?.[1])).filter(Number.isFinite);
    const logs = await this.prisma.checklistLog.findMany({
      where: { inventoryId: input.inventoryId, templateId: input.templateId, periodKey: input.periodKey, sessionId: input.sessionId, questionId: { in: questionIds } },
      select: { id: true, questionId: true },
    });
    const logByQuestion = new Map(logs.map(log => [log.questionId, log.id]));
    const created = [];
    for (const file of files) {
      const questionId = Number(/^photo_(\d+)$/.exec(file.fieldname)?.[1]);
      const checklistLogId = logByQuestion.get(questionId);
      if (!checklistLogId) continue;
      const storageKey = `checklist/${path.basename(file.filename)}`;
      const existing = await this.prisma.evidence.findUnique({ where: { storageKey } });
      if (existing) { created.push(existing); continue; }
      created.push(await this.prisma.evidence.create({ data: { checklistLogId, inventoryId: input.inventoryId, fileName: file.originalname || file.filename, storageKey, mimeType: file.mimetype, sizeBytes: file.size, uploadedById: input.actorId } }));
    }
    return created;
  }

  async getFilePath(evidenceId: number) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException('Evidence tidak ditemukan');
    const filePath = path.join(process.cwd(), 'storage', 'checklist', path.basename(evidence.storageKey));
    try { await fs.access(filePath); } catch { throw new NotFoundException('File evidence tidak ditemukan'); }
    return { filePath, mimeType: evidence.mimeType, fileName: evidence.fileName };
  }
}
