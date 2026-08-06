import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';

/** Canonical checklist frequencies (matches AssetItemType.checklistFrequency). */
export type ComplianceFrequency = 'daily' | 'weekly' | 'monthly';
export const FREQUENCIES: ComplianceFrequency[] = ['daily', 'weekly', 'monthly'];

/**
 * Lifecycle status of a single checklist period.
 * Resolution order (highest priority wins): done > offday > future > late > pending.
 */
export type PeriodStatus = 'done' | 'offday' | 'future' | 'late' | 'pending';

export interface CalendarPeriod {
  periodKey: string;
  label: string;
  /** Inclusive first calendar day of the period (YYYY-MM-DD). */
  start: string;
  /** Inclusive last calendar day of the period (YYYY-MM-DD). */
  end: string;
  /** Only set for weekly periods (1..4). */
  week?: number;
}

export interface ParsedPeriodKey {
  year: number;
  month: number;
  day?: number;
  week?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTH_LABELS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAILY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKLY_KEY = /^(\d{4})-(\d{2})-W([1-4])$/;
const MONTHLY_KEY = /^(\d{4})-(\d{2})$/;

/**
 * Period engine for compliance checklists.
 *
 * Mirrors the EAMS helpers (`period_helper`, `checklist_helper`,
 * `calender_period_helper`, `period_status_helper`) but with a single
 * consistent definition instead of EAMS' duplicated/conflicting ones.
 */
@Injectable()
export class CompliancePeriodEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /** Days after a period starts before it counts as late. */
  readonly LATE_THRESHOLDS: Record<ComplianceFrequency, number> = {
    daily: 21,
    weekly: 28,
    monthly: 90,
  };

  /** Weekly periods stay backfillable for this many months. */
  readonly WEEKLY_GRACE_MONTHS = 3;

  // ------------------------------------------------------------------
  // Key building & parsing
  // ------------------------------------------------------------------

  dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Week buckets reset every month: 1-7 => W1, 8-14 => W2, 15-21 => W3, 22+ => W4. */
  weekOfMonth(dayOfMonth: number): number {
    if (dayOfMonth <= 7) return 1;
    if (dayOfMonth <= 14) return 2;
    if (dayOfMonth <= 21) return 3;
    return 4;
  }

  isFrequency(value: unknown): value is ComplianceFrequency {
    return typeof value === 'string' && FREQUENCIES.includes(value as ComplianceFrequency);
  }

  /** Resolve the period a given calendar date falls into. */
  resolvePeriod(frequency: ComplianceFrequency, date: Date): { periodKey: string; label: string } {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    if (frequency === 'daily') {
      const periodKey = this.dateKey(date);
      return { periodKey, label: this.periodLabel('daily', periodKey) };
    }

    if (frequency === 'weekly') {
      const periodKey = `${year}-${month}-W${this.weekOfMonth(date.getDate())}`;
      return { periodKey, label: this.periodLabel('weekly', periodKey) };
    }

    const periodKey = `${year}-${month}`;
    return { periodKey, label: this.periodLabel('monthly', periodKey) };
  }

  parsePeriodKey(frequency: ComplianceFrequency, periodKey: string): ParsedPeriodKey | null {
    if (frequency === 'daily') {
      const m = DAILY_KEY.exec(periodKey);
      if (!m) return null;
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > this.daysInMonth(year, month)) return null;
      return { year, month, day };
    }

    if (frequency === 'weekly') {
      const m = WEEKLY_KEY.exec(periodKey);
      if (!m) return null;
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (month < 1 || month > 12) return null;
      return { year, month, week: Number(m[3]) };
    }

    const m = MONTHLY_KEY.exec(periodKey);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return { year, month };
  }

  isValidPeriodKey(frequency: ComplianceFrequency, periodKey: string): boolean {
    return this.parsePeriodKey(frequency, periodKey) !== null;
  }

  periodLabel(frequency: ComplianceFrequency, periodKey: string): string {
    const parsed = this.parsePeriodKey(frequency, periodKey);
    if (!parsed) return periodKey;

    const monthName = MONTH_LABELS[parsed.month - 1] ?? String(parsed.month);

    if (frequency === 'daily') {
      return `${String(parsed.day).padStart(2, '0')} ${monthName} ${parsed.year}`;
    }
    if (frequency === 'weekly') {
      return `${monthName} ${parsed.year} \u2022 Minggu ke-${parsed.week}`;
    }
    return `${monthName} ${parsed.year}`;
  }

  daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  // ------------------------------------------------------------------
  // Period boundaries
  // ------------------------------------------------------------------

  periodStart(frequency: ComplianceFrequency, periodKey: string): Date {
    const parsed = this.parsePeriodKey(frequency, periodKey);
    if (!parsed) {
      throw new BadRequestException(`Kunci periode "${periodKey}" tidak valid untuk frekuensi ${frequency}`);
    }

    if (frequency === 'daily') {
      return new Date(parsed.year, parsed.month - 1, parsed.day as number);
    }
    if (frequency === 'weekly') {
      return new Date(parsed.year, parsed.month - 1, ((parsed.week as number) - 1) * 7 + 1);
    }
    return new Date(parsed.year, parsed.month - 1, 1);
  }

  periodEnd(frequency: ComplianceFrequency, periodKey: string): Date {
    const parsed = this.parsePeriodKey(frequency, periodKey);
    if (!parsed) {
      throw new BadRequestException(`Kunci periode "${periodKey}" tidak valid untuk frekuensi ${frequency}`);
    }

    const lastDay = this.daysInMonth(parsed.year, parsed.month);

    if (frequency === 'daily') {
      return new Date(parsed.year, parsed.month - 1, parsed.day as number);
    }
    if (frequency === 'weekly') {
      // W4 absorbs the tail of the month (day 22 through the last day).
      const day = (parsed.week as number) === 4 ? lastDay : (parsed.week as number) * 7;
      return new Date(parsed.year, parsed.month - 1, day);
    }
    return new Date(parsed.year, parsed.month - 1, lastDay);
  }

  /**
   * Build every period of a calendar month (or the whole year for monthly
   * frequency when `month` is omitted).
   */
  generateCalendarPeriods(frequency: ComplianceFrequency, year: number, month?: number): CalendarPeriod[] {
    const periods: CalendarPeriod[] = [];

    if (frequency === 'monthly') {
      const months = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
      for (const m of months) {
        const periodKey = `${year}-${String(m).padStart(2, '0')}`;
        periods.push({
          periodKey,
          label: this.periodLabel('monthly', periodKey),
          start: this.dateKey(this.periodStart('monthly', periodKey)),
          end: this.dateKey(this.periodEnd('monthly', periodKey)),
        });
      }
      return periods;
    }

    if (!month) return periods;

    if (frequency === 'daily') {
      const total = this.daysInMonth(year, month);
      for (let d = 1; d <= total; d++) {
        const periodKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        periods.push({
          periodKey,
          label: this.periodLabel('daily', periodKey),
          start: periodKey,
          end: periodKey,
        });
      }
      return periods;
    }

    for (let w = 1; w <= 4; w++) {
      const periodKey = `${year}-${String(month).padStart(2, '0')}-W${w}`;
      periods.push({
        periodKey,
        label: this.periodLabel('weekly', periodKey),
        start: this.dateKey(this.periodStart('weekly', periodKey)),
        end: this.dateKey(this.periodEnd('weekly', periodKey)),
        week: w,
      });
    }
    return periods;
  }

  periodsBetween(frequency: ComplianceFrequency, start: Date, end: Date): string[] {
    const keys: string[] = [];
    const seen = new Set<string>();
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    let guard = 0;

    while (cursor.getTime() <= last.getTime() && guard < 800) {
      const { periodKey } = this.resolvePeriod(frequency, cursor);
      if (!seen.has(periodKey)) {
        seen.add(periodKey);
        keys.push(periodKey);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    return keys;
  }

  // ------------------------------------------------------------------
  // Timing rules
  // ------------------------------------------------------------------

  private startOfToday(now: Date = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  isPeriodFuture(frequency: ComplianceFrequency, periodKey: string, now: Date = new Date()): boolean {
    return this.periodStart(frequency, periodKey).getTime() > this.startOfToday(now).getTime();
  }

  isPeriodLate(frequency: ComplianceFrequency, periodKey: string, now: Date = new Date()): boolean {
    const start = this.periodStart(frequency, periodKey);
    const today = this.startOfToday(now);
    if (start.getTime() > today.getTime()) return false;
    const elapsedDays = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY);
    return elapsedDays > this.LATE_THRESHOLDS[frequency];
  }

  /**
   * Whether a period may still be filled in.
   * Future is always blocked; weekly additionally expires after the grace window.
   */
  isPeriodEditable(frequency: ComplianceFrequency, periodKey: string, now: Date = new Date()): boolean {
    if (this.isPeriodFuture(frequency, periodKey, now)) return false;

    if (frequency === 'weekly') {
      const today = this.startOfToday(now);
      const limit = new Date(today.getFullYear(), today.getMonth() - this.WEEKLY_GRACE_MONTHS, today.getDate());
      return this.periodStart(frequency, periodKey).getTime() >= limit.getTime();
    }

    return true;
  }

  // ------------------------------------------------------------------
  // Working days / holidays
  // ------------------------------------------------------------------

  /** Set of YYYY-MM-DD strings that are off days within the inclusive range. */
  async offdayDatesBetween(start: Date, end: Date): Promise<Set<string>> {
    return this.settingsService.offdayDatesBetween(start, end);
  }

  async isWorkingDay(date: Date): Promise<boolean> {
    return this.settingsService.isWorkingDay(date);
  }

  /**
   * Only daily periods can fall on an off day — weekly and monthly periods
   * span working days regardless of individual holidays (EAMS behaviour).
   */
  isOffdayPeriod(frequency: ComplianceFrequency, periodKey: string, offdays: Set<string>): boolean {
    if (frequency !== 'daily') return false;
    return offdays.has(periodKey);
  }

  async isOffdayPeriodAsync(frequency: ComplianceFrequency, periodKey: string): Promise<boolean> {
    if (frequency !== 'daily') return false;
    const start = this.periodStart(frequency, periodKey);
    return !(await this.isWorkingDay(start));
  }

  // ------------------------------------------------------------------
  // Status resolution
  // ------------------------------------------------------------------

  resolveStatus(input: {
    frequency: ComplianceFrequency;
    periodKey: string;
    hasLog: boolean;
    offday: boolean;
    now?: Date;
  }): PeriodStatus {
    const { frequency, periodKey, hasLog, offday } = input;
    const now = input.now ?? new Date();

    // A submitted period is locked, even if it later becomes a holiday.
    if (hasLog) return 'done';
    if (offday) return 'offday';
    if (this.isPeriodFuture(frequency, periodKey, now)) return 'future';
    if (this.isPeriodLate(frequency, periodKey, now)) return 'late';
    return 'pending';
  }

  // ------------------------------------------------------------------
  // Misc helpers
  // ------------------------------------------------------------------

  async resolveAllowNA(itemTypeId: number | null | undefined): Promise<boolean> {
    if (!itemTypeId) return false;
    const itemType = await this.prisma.assetItemType.findUnique({ where: { id: itemTypeId } });
    return itemType?.allowNA ?? false;
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
