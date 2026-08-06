import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';
import { NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceService: ComplianceService,
    private readonly whatsapp: WhatsAppProvider,
    private readonly email: EmailProvider,
  ) {}

  async sendReminder(inventoryId: number, channel: NotificationChannel) {
    // 1. Get recipients (PICs)
    const inventory = await this.prisma.complianceInventory.findUnique({
      where: { id: inventoryId },
      include: { picAssignments: { include: { user: true } } },
    });
    if (!inventory) throw new NotFoundException('Inventory not found');

    const pics = inventory.picAssignments.map(pa => pa.user);

    // 2. Resolve eligible PICs
    for (const user of pics) {
      // Check preferences
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { userId_channel: { userId: user.id, channel } }
      });
      if (pref && !pref.enabled) {
        this.logger.log(`Skipped notification for user ${user.id}: disabled preference`);
        continue;
      }

      // 3. Send
      try {
        if (channel === 'WHATSAPP') {
          if (!user.phone) {
             this.logger.warn(`Skipped notification for user ${user.id}: no phone number`);
             continue;
          }
          await this.whatsapp.send(user.phone, 'Assetra Reminder', `Reminder checklist for ${inventory.assetCode}`);
        } else {
          if (!user.email) {
             this.logger.warn(`Skipped notification for user ${user.id}: no email`);
             continue;
          }
          await this.email.send(user.email, 'Assetra Reminder', `Reminder checklist for ${inventory.assetCode}`);
        }

        // Log notification
        await this.prisma.notification.create({
            data: {
                userId: user.id,
                channel,
                entityType: 'ComplianceInventory',
                entityId: inventory.id,
                subject: 'Assetra Reminder',
                body: `Reminder checklist for ${inventory.assetCode}`,
                status: 'SENT',
                scheduledFor: new Date(),
            }
        });
      } catch (error) {
        this.logger.error(`Failed to send ${channel} to user ${user.id}: ${error}`);
      }
    }
  }
}
