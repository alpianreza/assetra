import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private getBaseUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  async getQrDetail(inventoryId: number, actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: {
        category: true,
        area: true,
        itemType: true,
        picAssignments: {
          include: { user: true },
        },
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
      picUsers: inventory.picAssignments.map((pa) => ({
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
      select: { publicId: true, assetCode: true },
    });

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const publicUrl = `${this.getBaseUrl()}/q/${inventory.publicId}`;

    if (format === 'svg') {
      return QRCode.toString(publicUrl, { type: 'svg', width: 300, margin: 2 });
    }
    return QRCode.toDataURL(publicUrl, { width: 300, margin: 2 });
  }

  async getPublicInventory(publicId: string) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { publicId },
      include: {
        category: true,
        area: true,
        itemType: true,
        picAssignments: {
          include: { user: { select: { id: true, name: true } } },
        },
        checklistTemplateAssignments: {
          include: {
            template: {
              include: {
                itemType: true,
              },
            },
          },
        },
      },
    });

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    // Get latest compliance status from logs
    const latestLog = await this.prisma.checklistLog.findFirst({
      where: {
        inventoryId: inventory.id,
        questionId: null,
      },
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
      picUsers: inventory.picAssignments.map((pa) => ({
        id: pa.user.id,
        name: pa.user.name,
      })),
      latestCompliance: latestLog
        ? {
            status: latestLog.status,
            checkDate: latestLog.checkDate,
            periodKey: latestLog.periodKey,
          }
        : null,
    };
  }

  async getBatchQr(inventoryIds: number[]) {
    const inventories = await this.prisma.complianceInventory.findMany({
      where: { id: { in: inventoryIds } },
      include: {
        category: true,
        area: true,
        itemType: true,
      },
    });

    if (inventories.length !== inventoryIds.length) {
      throw new NotFoundException('Beberapa inventaris tidak ditemukan');
    }

    return inventories.map((inv) => ({
      id: inv.id,
      publicId: inv.publicId,
      assetCode: inv.assetCode,
      typeDescription: inv.typeDescription,
      category: inv.category?.name,
      area: inv.area?.name,
      itemType: inv.itemType?.name,
      publicUrl: `${this.getBaseUrl()}/q/${inv.publicId}`,
    }));
  }

  async generateQrLabelSvg(inventoryId: number, options?: {
    includeCompanyName?: boolean;
    companyName?: string;
  }): Promise<string> {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: { itemType: true },
    });

    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const publicUrl = `${this.getBaseUrl()}/q/${inventory.publicId}`;
    const qrSvg = await QRCode.toString(publicUrl, { type: 'svg', width: 300, margin: 2 });

    // Extract just the SVG element
    const svgMatch = qrSvg.match(/<svg[\s\S]*<\/svg>/);
    const qrSvgContent = svgMatch ? svgMatch[0] : qrSvg;

    const companyName = options?.companyName || 'Assetra';

    return `
<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="200" fill="white"/>
  <text x="150" y="25" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#111827">Assetra</text>
  <text x="150" y="45" font-family="Arial, sans-serif" font-size="10" text-anchor="middle" fill="#6b7280">${inventory.assetCode}</text>
  <text x="150" y="60" font-family="Arial, sans-serif" font-size="9" text-anchor="middle" fill="#6b7280">${inventory.itemType?.name ?? '-'}</text>
  <g transform="translate(75, 80)">${qrSvgContent}</g>
  <text x="150" y="185" font-family="Arial, sans-serif" font-size="8" text-anchor="middle" fill="#9ca3af">Scan untuk detail</text>
</svg>
`;
  }
}