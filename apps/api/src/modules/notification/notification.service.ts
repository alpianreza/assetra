import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';
import { NotificationChannel } from '@prisma/client';

const IN_APP_PROVIDER = 'IN_APP';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(private readonly prisma: PrismaService, private readonly complianceService: ComplianceService, private readonly whatsapp: WhatsAppProvider, private readonly email: EmailProvider) {}

  async syncChecklistNotifications(userId: number) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const entityType = `CHECKLIST_DUE:${monthKey}`;
    const assignments = await this.prisma.inventoryPicAssignment.findMany({
      where: { userId, inventory: { status: { not: 'disposed' } } },
      include: { inventory: { include: { itemType: true, area: true } } },
    });

    for (const assignment of assignments) {
      const inventory = assignment.inventory;
      const periods = await this.complianceService.inventoryPeriods(inventory.id, monthKey).catch(() => null);
      if (!periods) continue;
      const due = periods.periods.filter((period: any) => period.status === 'pending' || period.status === 'late');
      const late = due.filter((period: any) => period.status === 'late').length;
      const existing = await this.prisma.notification.findFirst({ where: { userId, provider: IN_APP_PROVIDER, entityType, entityId: inventory.id } });
      if (!due.length) {
        if (existing?.status === 'PENDING') await this.prisma.notification.delete({ where: { id: existing.id } });
        continue;
      }
      const subject = late > 0 ? `Checklist terlambat • ${inventory.assetCode}` : `Checklist perlu diisi • ${inventory.assetCode}`;
      const body = `${due.length} checklist belum selesai${late ? `, ${late} terlambat` : ''} untuk ${inventory.itemType?.name ?? 'inventaris'}${inventory.area?.name ? ` di ${inventory.area.name}` : ''}.`;
      if (existing) {
        if (existing.status === 'PENDING') await this.prisma.notification.update({ where: { id: existing.id }, data: { subject, body, scheduledFor: now } });
      } else {
        await this.prisma.notification.create({ data: { userId, channel: 'EMAIL', provider: IN_APP_PROVIDER, entityType, entityId: inventory.id, subject, body, status: 'PENDING', scheduledFor: now } });
      }
    }
  }

  async listInApp(userId: number, options: { limit: number; unreadOnly: boolean }) {
    const where = { userId, provider: IN_APP_PROVIDER, ...(options.unreadOnly ? { status: 'PENDING' as const } : {}) };
    const [items, unreadCount, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: Math.min(100, Math.max(1, options.limit)) }),
      this.prisma.notification.count({ where: { userId, provider: IN_APP_PROVIDER, status: 'PENDING' } }),
      this.prisma.notification.count({ where: { userId, provider: IN_APP_PROVIDER } }),
    ]);
    return { unreadCount, total, items: items.map(item => ({ id: item.id, title: item.subject, message: item.body, read: item.status !== 'PENDING', type: item.subject.toLowerCase().includes('terlambat') ? 'late' : 'reminder', inventoryId: item.entityId, href: item.entityId ? `/inventory/${item.entityId}` : '/', createdAt: item.createdAt, updatedAt: item.updatedAt })) };
  }

  async markRead(userId: number, id: number) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId, provider: IN_APP_PROVIDER } });
    if (!notification) throw new NotFoundException('Notifikasi tidak ditemukan');
    await this.prisma.notification.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
    return { id, read: true };
  }

  async markAllRead(userId: number) {
    const result = await this.prisma.notification.updateMany({ where: { userId, provider: IN_APP_PROVIDER, status: 'PENDING' }, data: { status: 'SENT', sentAt: new Date() } });
    return { updated: result.count };
  }

  async removeInApp(userId: number, id: number) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId, provider: IN_APP_PROVIDER } });
    if (!notification) throw new NotFoundException('Notifikasi tidak ditemukan');
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }

  async sendReminder(inventoryId: number, channel: NotificationChannel) {
    const inventory = await this.prisma.complianceInventory.findUnique({ where: { id: inventoryId }, include: { picAssignments: { include: { user: true } } } });
    if (!inventory) throw new NotFoundException('Inventory not found');
    for (const user of inventory.picAssignments.map(assignment => assignment.user)) {
      const preference = await this.prisma.notificationPreference.findUnique({ where: { userId_channel: { userId: user.id, channel } } });
      if (preference && !preference.enabled) continue;
      try {
        if (channel === 'WHATSAPP') { if (!user.phone) continue; await this.whatsapp.send(user.phone, 'Assetra Reminder', `Reminder checklist for ${inventory.assetCode}`); }
        else { if (!user.email) continue; await this.email.send(user.email, 'Assetra Reminder', `Reminder checklist for ${inventory.assetCode}`); }
        await this.prisma.notification.create({ data: { userId: user.id, channel, entityType: 'ComplianceInventory', entityId: inventory.id, subject: 'Assetra Reminder', body: `Reminder checklist for ${inventory.assetCode}`, status: 'SENT', scheduledFor: new Date() } });
      } catch (error) { this.logger.error(`Failed to send ${channel} to user ${user.id}: ${error}`); }
    }
  }
}
