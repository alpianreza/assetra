import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';

/** Canonical checklist frequencies (matches AssetItemType.checklistFrequency). */
export type ComplianceFrequency = 'daily' | 'weekly' | 'monthly';
export const FREQUENCIES: ComplianceFrequency[] = ['daily', 'weekly', 'monthly'];

@Injectable()
export class CompliancePeriodEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /** Late thresholds (days) per frequency — EAMS business rule, single source of truth. */
  readonly LATE_THRESHOLDS: Record<ComplianceFrequency, number> = {
    daily: 21,
    weekly: 28,
    monthly: 90,
  };

  dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  weeklyKey(date: Date, anchorMonday?: Date): { periodKey: string; label: string; week: number } {
    const currentMonday = this.mondayOf(date);
    const anchor = anchorMonday ? this.mondayOf(anchorMonday) : new Date(2026, 0, 5);
    const diffDays = Math.floor((currentMonday.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000));
    const weekIndex = Math.max(0, Math.floor(diffDays / 7));
    const week = (weekIndex % 4) + 1;
    const year = currentMonday.getFullYear();
    return {
      periodKey: `${year}-W${week}`,
      label: `W${week}`,
      week,
    };
  }

  private mondayOf(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  monthlyKey(date: Date): { periodKey: string; label: string } {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return { periodKey: `${y}-${m}`, label: `${y}-${m}` };
  }

  resolvePeriod(frequency: ComplianceFrequency, date: Date, anchorMonday?: Date) {
    switch (frequency) {
      case 'daily':
        return { periodKey: this.dateKey(date), label: this.dateKey(date) };
      case 'weekly':
        return this.weeklyKey(date, anchorMonday);
      case 'monthly':
        return this.monthlyKey(date);
    }
  }

  periodsBetween(frequency: ComplianceFrequency, start: Date, end: Date): string[] {
    const keys: string[] = [];
    const cursor = new Date(start);
    const endTime = end.getTime();
    let guard = 0;
    while (cursor.getTime() <= endTime && guard < 400) {
      const { periodKey } = this.resolvePeriod(frequency, cursor);
      if (!keys.includes(periodKey)) keys.push(periodKey);
      if (frequency === 'daily') cursor.setDate(cursor.getDate() + 1);
      else if (frequency === 'weekly') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
      guard++;
    }
    return keys;
  }

  async isWorkingDay(date: Date): Promise<boolean> {
    return this.settingsService.isWorkingDay(date);
  }

  async resolveAllowNA(itemTypeId: number | null | undefined): Promise<boolean> {
    if (!itemTypeId) return false;
    const itemType = await this.prisma.assetItemType.findUnique({ where: { id: itemTypeId } });
    return itemType?.allowNA ?? false;
  }

  isPeriodLate(frequency: ComplianceFrequency, periodStart: Date, now: Date = new Date()): boolean {
    const threshold = this.LATE_THRESHOLDS[frequency];
    const elapsedDays = Math.floor((now.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000));
    return elapsedDays > threshold;
  }

  periodStart(frequency: ComplianceFrequency, periodKey: string, anchorMonday?: Date): Date {
    if (frequency === 'daily') {
      const [y, m, d] = periodKey.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (frequency === 'weekly') {
      const [yearStr, wStr] = periodKey.split('-W');
      const year = Number(yearStr);
      const week = Number(wStr);
      const jan1 = new Date(year, 0, 1);
      const jan1Day = jan1.getDay();
      const mondayJan1 = new Date(jan1);
      mondayJan1.setDate(jan1.getDate() + ((8 - jan1Day) % 7 || 7));
      const target = new Date(mondayJan1);
      target.setDate(mondayJan1.getDate() + (week - 1) * 7);
      return target;
    }
    const [y, m] = periodKey.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  occurrenceKey(inventoryId: number, templateId: number, periodKey: string, sessionId?: number | null): string {
    return `${inventoryId}:${templateId}:${periodKey}:${sessionId ?? 'none'}`;
  }

  completionStatus(questionCount: number, answeredCount: number): 'completed' | 'incomplete' | 'pending' {
    if (questionCount === 0) return 'pending';
    if (answeredCount >= questionCount) return 'completed';
    if (answeredCount > 0) return 'incomplete';
    return 'pending';
  }
}
