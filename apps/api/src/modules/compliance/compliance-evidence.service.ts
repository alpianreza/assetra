import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class ComplianceEvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { search?: string; month?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1); const limit = Math.min(60, Math.max(1, query.limit || 24));
    const where: any = {};
    if (query.month && /^\d{4}-\d{2}$/.test(query.month)) where.checklistLog = { periodKey: { startsWith: query.month } };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fileName: { contains: term } },
        { inventory: { assetCode: { contains: term } } },
        { inventory: { itemType: { name: { contains: term } } } },
        { inventory: { area: { name: { contains: term } } } },
        { uploadedBy: { name: { contains: term } } },
      ];
    }
    const [total, rows, findings, inventoryRows, uploaderRows] = await Promise.all([
      this.prisma.evidence.count({ where }),
      this.prisma.evidence.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { inventory: { include: { itemType: true, area: true } }, checklistLog: { include: { question: true, template: true } }, uploadedBy: { select: { id: true, name: true } } } }),
      this.prisma.evidence.count({ where: { ...where, checklistLog: { ...(where.checklistLog || {}), status: 'not_ok' } } }),
      this.prisma.evidence.findMany({ where, distinct: ['inventoryId'], select: { inventoryId: true } }),
      this.prisma.evidence.findMany({ where, distinct: ['uploadedById'], select: { uploadedById: true } }),
    ]);
    return {
      items: rows.map(row => ({ id: row.id, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: row.sizeBytes, createdAt: row.createdAt, url: `/api/v1/compliance/evidence/${row.id}/file`, inventory: { id: row.inventory.id, assetCode: row.inventory.assetCode, itemType: row.inventory.itemType?.name ?? null, area: row.inventory.area?.name ?? null, specificArea: row.inventory.specificArea }, checklist: { logId: row.checklistLogId, template: row.checklistLog.template.name, question: row.checklistLog.question?.questionText ?? null, periodKey: row.checklistLog.periodKey, periodLabel: row.checklistLog.periodLabel, status: row.checklistLog.status }, uploadedBy: row.uploadedBy }),
      summary: { total, findings, inventories: inventoryRows.length, uploaders: uploaderRows.length },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async persistUploadedFiles(input: { inventoryId: number; templateId: number; periodKey: string; sessionId: number | null; files: Express.Multer.File[]; actorId: number }) {
    const files = input.files.filter(file => /^photo_(\d+)$/.test(file.fieldname)); if (!files.length) return [];
    const questionIds = files.map(file => Number(/^photo_(\d+)$/.exec(file.fieldname)?.[1])).filter(Number.isFinite);
    const logs = await this.prisma.checklistLog.findMany({ where: { inventoryId: input.inventoryId, templateId: input.templateId, periodKey: input.periodKey, sessionId: input.sessionId, questionId: { in: questionIds } }, select: { id: true, questionId: true } });
    const logByQuestion = new Map(logs.map(log => [log.questionId, log.id])); const created = [];
    for (const file of files) { const questionId = Number(/^photo_(\d+)$/.exec(file.fieldname)?.[1]); const checklistLogId = logByQuestion.get(questionId); if (!checklistLogId) continue; const storageKey = `checklist/${path.basename(file.filename)}`; const existing = await this.prisma.evidence.findUnique({ where: { storageKey } }); if (existing) { created.push(existing); continue; } created.push(await this.prisma.evidence.create({ data: { checklistLogId, inventoryId: input.inventoryId, fileName: file.originalname || file.filename, storageKey, mimeType: file.mimetype, sizeBytes: file.size, uploadedById: input.actorId } })); }
    return created;
  }

  async getFilePath(evidenceId: number) { const evidence = await this.prisma.evidence.findUnique({ where: { id: evidenceId } }); if (!evidence) throw new NotFoundException('Evidence tidak ditemukan'); const filePath = path.join(process.cwd(), 'storage', 'checklist', path.basename(evidence.storageKey)); try { await fs.access(filePath); } catch { throw new NotFoundException('File evidence tidak ditemukan'); } return { filePath, mimeType: evidence.mimeType, fileName: evidence.fileName }; }
}
