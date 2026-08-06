import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class InventoryMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private photoDirectory(): string {
    return path.join(process.cwd(), 'storage', 'inventory');
  }

  async setPhoto(inventoryId: number, fileName: string, actorId: number) {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      select: { id: true, photo: true },
    });
    if (!inventory) throw new NotFoundException('Inventaris tidak ditemukan');

    const previous = inventory.photo;
    await this.prisma.complianceInventory.update({
      where: { id: inventoryId },
      data: { photo: fileName },
    });

    if (previous && previous !== fileName) {
      await fs.unlink(path.join(this.photoDirectory(), path.basename(previous))).catch(() => undefined);
    }

    await this.auditService.log(actorId, 'INVENTORY_PHOTO_CHANGED', 'ComplianceInventory', inventoryId, undefined, { photo: previous }, { photo: fileName });
    return { id: inventoryId, photo: fileName };
  }

  async getPhotoPath(inventoryId: number): Promise<string> {
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      select: { photo: true },
    });
    if (!inventory?.photo) throw new NotFoundException('Foto inventaris tidak ditemukan');

    const filePath = path.join(this.photoDirectory(), path.basename(inventory.photo));
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File foto inventaris tidak ditemukan');
    }
    return filePath;
  }
}
