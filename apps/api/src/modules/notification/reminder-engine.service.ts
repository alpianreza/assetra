import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationService } from './notification.service';
import { ComplianceFrequency } from '../compliance/period-engine.service';

interface ReminderContext {
  inventoryId: number;
  templateId: number;
  periodKey: string;
  sessionId: number | null;
  frequency: string;
  inventoryAssetCode: string;
  templateName: string;
  itemTypeName: string;
  areaName: string | null;
  sessionName: string | null;
  status: string;
}

interface ReminderSummary {
  processed: number;
  sentWhatsApp: number;
  sentEmail: number;
  failed: number;
  skippedNoPhone: number;
  skippedNoEmail: number;
  skippedPreference: number;
  duplicateSkipped: number;
}

@Injectable()
export class ReminderEngine {
  private readonly logger = new Logger(ReminderEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceService: ComplianceService,
    private readonly notificationService: NotificationService,
  ) {}

  async findEligibleOccurrences(): Promise<ReminderContext[]> {
    const allInventories = await this.prisma.complianceInventory.findMany({
      where: { checklistTemplateAssignments: { some: {} } },
      include: {
        itemType: true,
        area: true,
        checklistTemplateAssignments: {
          include: { template: { include: { itemType: true } } },
        },
      },
    });

    const results: ReminderContext[] = [];

    for (const inventory of allInventories) {
      for (const assignment of inventory.checklistTemplateAssignments) {
        const template = assignment.template;
        const frequency = template.itemType.checklistFrequency;
        const periods = await this.complianceService.inventoryPeriods(inventory.id);

        for (const period of periods.periods) {
          if (period.status === 'pending' || period.status === 'late') {
            if (period.templateId !== template.id) continue;
            if (period.templateId !== template.id) continue;

            results.push({
              inventoryId: inventory.id,
              templateId: template.id,
              periodKey: period.periodKey,
              sessionId: period.sessionId,
              frequency,
              inventoryAssetCode: inventory.assetCode,
              templateName: template.name,
              itemTypeName: inventory.itemType?.name ?? '',
              areaName: inventory.area?.name ?? null,
              sessionName: period.sessionName,
              status: period.status,
            });
          }
        }
      }
    }

    return results;
  }

  async preview(): Promise<{
    totalEligible: number;
    whatsappEligible: number;
    emailEligible: number;
    missingPhone: number;
    missingEmail: number;
    disabledPreference: number;
    details: any[];
  }> {
    const occurrences = await this.findEligibleOccurrences();
    const summary = {
      totalEligible: 0,
      whatsappEligible: 0,
      emailEligible: 0,
      missingPhone: 0,
      missingEmail: 0,
      disabledPreference: 0,
      details: [] as any[],
    };

    for (const occ of occurrences) {
      const inventory = await this.prisma.complianceInventory.findUnique({
        where: { id: occ.inventoryId },
        include: { picAssignments: { include: { user: true } } },
      });
      if (!inventory) continue;

      const pics = inventory.picAssignments.map(pa => pa.user);

      for (const user of pics) {
        summary.totalEligible++;

        const waPref = await this.prisma.notificationPreference.findUnique({
          where: { userId_channel: { userId: user.id, channel: 'WHATSAPP' } },
        });
        if (waPref && !waPref.enabled) {
          summary.disabledPreference++;
        }

        const emPref = await this.prisma.notificationPreference.findUnique({
          where: { userId_channel: { userId: user.id, channel: 'EMAIL' } },
        });
        if (emPref && !emPref.enabled) {
          summary.disabledPreference++;
        }

        if (user.phone) summary.whatsappEligible++;
        else summary.missingPhone++;

        if (user.email) summary.emailEligible++;
        else summary.missingEmail++;

        summary.details.push({
          inventory: user.id,
          hasPhone: !!user.phone,
          hasEmail: !!user.email,
          waDisabled: waPref && !waPref.enabled,
          emDisabled: emPref && !emPref.enabled,
        });
      }
    }

    return summary;
  }

  async dryRun(): Promise<any> {
    return this.preview();
  }

  async executeManual(channel: 'WHATSAPP' | 'EMAIL' | 'ALL'): Promise<any> {
    const summary = {
      processed: 0,
      sentWhatsApp: 0,
      sentEmail: 0,
      failed: 0,
      skippedNoPhone: 0,
      skippedNoEmail: 0,
      skippedPreference: 0,
      duplicateSkipped: 0,
    };

    const occurrences = await this.findEligibleOccurrences();
    const now = new Date();

    for (const occ of occurrences) {
      // Check duplicate via notification table
      const existing = await this.prisma.notification.findFirst({
        where: {
          entityType: 'ComplianceInventory',
          entityId: occ.inventoryId,
          channel: { in: channel === 'ALL' ? ['WHATSAPP', 'EMAIL'] : [channel] },
          scheduledFor: { lte: new Date() },
        },
      });

      if (existing) {
        summary.duplicateSkipped++;
        continue;
      }

      if (channel === 'WHATSAPP' || channel === 'ALL') {
        await this.notificationService.sendReminder(occ.inventoryId, 'WHATSAPP');
        summary.sentWhatsApp++;
      }
      if (channel === 'EMAIL' || channel === 'ALL') {
        await this.notificationService.sendReminder(occ.inventoryId, 'EMAIL');
        summary.sentEmail++;
      }
      summary.processed++;
    }

    return summary;
  }

  async executeDryRun(channel: 'WHATSAPP' | 'EMAIL' | 'ALL'): Promise<any> {
    // Just call preview with the specific channel filter
    const preview = await this.preview();
    return {
      ...preview,
      channel,
      mode: 'dry-run',
    };
  }
}