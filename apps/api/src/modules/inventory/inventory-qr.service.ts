import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as QRCode from 'qrcode';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class InventoryQrService {
  constructor(private readonly prisma: PrismaService) {}

  private getBaseUrl(): string {
    return (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  }

  private escapeXml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  async generateAndStore(inventoryId: number): Promise<string> {
    const inventory = await this.prisma.complianceInventory.findUnique({ where: { id: inventoryId }, select: { id: true, publicId: true, assetCode: true } });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');
    const targetUrl = `${this.getBaseUrl()}/q/${inventory.publicId}`;
    const rawSvg = await QRCode.toString(targetUrl, { type: 'svg', width: 300, margin: 2, errorCorrectionLevel: 'H' });
    const viewBox = rawSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const size = viewBox ? Number(viewBox[1]) : 300;
    const boxWidth = size * 0.56; const boxHeight = size * 0.1; const boxX = (size - boxWidth) / 2; const boxY = (size - boxHeight) / 2; const fontSize = size * 0.038;
    const label = this.escapeXml(inventory.assetCode);
    const overlay = `\n  <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="${size * 0.012}" fill="white"/>\n  <text x="${size / 2}" y="${size / 2}" dy="0.35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="black" textLength="${boxWidth * 0.9}" lengthAdjust="spacingAndGlyphs">${label}</text>`;
    const decoratedSvg = rawSvg.replace('</svg>', `${overlay}\n</svg>`);
    const directory = path.join(process.cwd(), 'storage', 'qr');
    await fs.mkdir(directory, { recursive: true });
    const fileName = `qr_inv_${inventory.id}.svg`;
    await fs.writeFile(path.join(directory, fileName), decoratedSvg, 'utf8');
    await this.prisma.complianceInventory.update({ where: { id: inventory.id }, data: { qrImage: fileName } });
    return fileName;
  }
}
