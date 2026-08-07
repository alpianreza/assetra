import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { InventoryQrService } from '../inventory/inventory-qr.service';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly inventoryQrService: InventoryQrService,
  ) {}

  private getBaseUrl(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  }

  async getGallery() {
    const inventories = await this.prisma.complianceInventory.findMany({
      include: { category: true, area: true, itemType: true },
      orderBy: { assetCode: 'asc' },
    });
    const baseUrl = this.getBaseUrl();

    return {
      baseUrl,
      total: inventories.length,
      generated: inventories.filter(inventory => Boolean(inventory.qrImage)).length,
      items: inventories.map(inventory => ({
        id: inventory.id,
        publicId: inventory.publicId,
        assetCode: inventory.assetCode,
        itemType: inventory.itemType?.name ?? 'Tanpa Jenis Item',
        category: inventory.category?.name ?? null,
        area: inventory.area?.name ?? null,
        specificArea: inventory.specificArea,
        qrImage: inventory.qrImage,
        publicUrl: `${baseUrl}/q/${inventory.publicId}`,
        updatedAt: inventory.updatedAt,
      })),
    };
  }

  async regenerate(inventoryIds: number[] | undefined, actorId: number) {
    const uniqueIds = inventoryIds?.length ? Array.from(new Set(inventoryIds)) : undefined;
    const inventories = await this.prisma.complianceInventory.findMany({
      where: uniqueIds ? { id: { in: uniqueIds } } : undefined,
      select: { id: true, assetCode: true },
      orderBy: { assetCode: 'asc' },
    });

    if (uniqueIds && inventories.length !== uniqueIds.length) {
      throw new NotFoundException('Beberapa inventaris yang dipilih tidak ditemukan');
    }

    const failed: Array<{ id: number; assetCode: string; message: string }> = [];
    let regenerated = 0;
    for (const inventory of inventories) {
      try {
        await this.inventoryQrService.generateAndStore(inventory.id);
        regenerated += 1;
      } catch (error) {
        failed.push({
          id: inventory.id,
          assetCode: inventory.assetCode,
          message: error instanceof Error ? error.message : 'Gagal membuat QR',
        });
      }
    }

    await this.auditService.log(
      actorId,
      'QR_REGENERATED',
      'ComplianceInventory',
      undefined,
      undefined,
      null,
      {
        requestedCount: inventories.length,
        regenerated,
        failedCount: failed.length,
        baseUrl: this.getBaseUrl(),
        inventoryIds: inventories.map(inventory => inventory.id),
      },
    );

    return {
      baseUrl: this.getBaseUrl(),
      requested: inventories.length,
      regenerated,
      failed,
    };
  }

  async getStoredQrPath(inventoryId: number): Promise<string> {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      select: { qrImage: true },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    let fileName = inventory.qrImage;
    if (!fileName) fileName = await this.inventoryQrService.generateAndStore(inventoryId);

    let filePath = path.join(process.cwd(), 'storage', 'qr', path.basename(fileName));
    try {
      await fs.access(filePath);
    } catch {
      fileName = await this.inventoryQrService.generateAndStore(inventoryId);
      filePath = path.join(process.cwd(), 'storage', 'qr', path.basename(fileName));
    }
    return filePath;
  }

  async getQrDetail(inventoryId: number, _actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: {
        category: true,
        area: true,
        itemType: true,
        picAssignments: { include: { user: true } },
      },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const publicUrl = `${this.getBaseUrl()}/q/${inventory.publicId}`;
    return {
      id: inventory.id,
      publicId: inventory.publicId,
      assetCode: inventory.assetCode,
      typeDescription: inventory.typeDescription,
      specificArea: inventory.specificArea,
      status: inventory.status,
      category: inventory.category?.name,
      area: inventory.area?.name,
      itemType: inventory.itemType?.name,
      publicUrl,
      qrPayload: publicUrl,
      picUsers: inventory.picAssignments.map(pa => ({
        id: pa.user.id,
        name: pa.user.name,
        phone: pa.user.phone,
        email: pa.user.email,
      })),
    };
  }

  async getQrImage(inventoryId: number, format: 'png' | 'svg' = 'png'): Promise<string> {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      select: { publicId: true },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const publicUrl = `${this.getBaseUrl()}/q/${inventory.publicId}`;
    if (format === 'svg') return QRCode.toString(publicUrl, { type: 'svg', width: 300, margin: 2 });
    return QRCode.toDataURL(publicUrl, { width: 300, margin: 2 });
  }

  async getPublicInventory(publicId: string) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { publicId },
      include: {
        category: true,
        area: true,
        itemType: true,
        picAssignments: { include: { user: { select: { id: true, name: true } } } },
        checklistTemplateAssignments: {
          include: { template: { include: { itemType: true } } },
        },
      },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const latestLog = await this.prisma.checklistLog.findFirst({
      where: { inventoryId: inventory.id, questionId: null },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: inventory.id,
      assetCode: inventory.assetCode,
      typeDescription: inventory.typeDescription,
      specificArea: inventory.specificArea,
      status: inventory.status,
      category: inventory.category?.name,
      area: inventory.area?.name,
      itemType: inventory.itemType?.name,
      picUsers: inventory.picAssignments.map(pa => ({ id: pa.user.id, name: pa.user.name })),
      latestCompliance: latestLog ? {
        status: latestLog.status,
        checkDate: latestLog.checkDate,
        periodKey: latestLog.periodKey,
      } : null,
    };
  }

  async getBatchQr(inventoryIds: number[]) {
    const inventories = await this.prisma.complianceInventory.findMany({
      where: { id: { in: inventoryIds } },
      include: { category: true, area: true, itemType: true },
    });
    if (inventories.length !== inventoryIds.length) throw new NotFoundException('Beberapa inventaris tidak ditemukan');

    return inventories.map(inventory => ({
      id: inventory.id,
      publicId: inventory.publicId,
      assetCode: inventory.assetCode,
      typeDescription: inventory.typeDescription,
      category: inventory.category?.name,
      area: inventory.area?.name,
      itemType: inventory.itemType?.name,
      publicUrl: `${this.getBaseUrl()}/q/${inventory.publicId}`,
    }));
  }

  async generateQrLabelSvg(inventoryId: number, options?: { includeCompanyName?: boolean; companyName?: string }): Promise<string> {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: { itemType: true },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const publicUrl = `${this.getBaseUrl()}/q/${inventory.publicId}`;
    const qrSvg = await QRCode.toString(publicUrl, { type: 'svg', width: 110, margin: 1, errorCorrectionLevel: 'H' });
    const inner = qrSvg.replace(/<\/?svg[^>]*>/g, '');
    const companyName = options?.companyName || 'Assetra';

    return `<svg width="300" height="360" viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="360" rx="16" fill="white"/>
  <text x="150" y="32" font-family="Arial,sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#111827">${companyName}</text>
  <text x="150" y="55" font-family="Arial,sans-serif" font-size="12" text-anchor="middle" fill="#374151">${inventory.assetCode}</text>
  <text x="150" y="75" font-family="Arial,sans-serif" font-size="10" text-anchor="middle" fill="#6b7280">${inventory.itemType?.name ?? '-'}</text>
  <svg x="40" y="88" width="220" height="220" viewBox="0 0 110 110">${inner}</svg>
  <text x="150" y="334" font-family="Arial,sans-serif" font-size="10" text-anchor="middle" fill="#6b7280">Scan untuk membuka detail inventaris</text>
</svg>`;
  }
}
