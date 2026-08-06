import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { WorkingDayType, UpdateOrganizationDto } from './settings.dto';

/**
 * Fallback weekly schedule used only when `working_day_configuration` has not
 * been seeded yet: Sunday off, every other day working. Saturday is therefore
 * adjustable from the UI rather than hardcoded.
 */
const DEFAULT_OFF_DAYS_OF_WEEK = [0];

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getOrganization() {
    const org = await this.prisma.organization.findFirst();
    if (!org) {
      // Create a default if none exists, this is a singleton
      return this.prisma.organization.create({ data: { name: 'Assetra Default Org' } });
    }
    return org;
  }

  async updateOrganization(dto: UpdateOrganizationDto, actorId: number) {
    const org = await this.getOrganization(); // Ensures a default exists
    const updated = await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        name: dto.name,
        shortName: dto.shortName,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        reportFooter: dto.reportFooter,
      },
    });
    await this.auditService.log(actorId, 'ORGANIZATION_UPDATED', 'Organization', updated.id, undefined, org, updated);
    return updated;
  }

  async getWorkingDays() {
    const configs = await this.prisma.workingDayConfiguration.findMany({ orderBy: { dayOfWeek: 'asc' } });
    if (configs.length === 7) return configs;

    // Backfill any missing day so the UI always shows a full week.
    const existing = new Set(configs.map((c) => c.dayOfWeek));
    const missing = [0, 1, 2, 3, 4, 5, 6].filter((d) => !existing.has(d));

    for (const dayOfWeek of missing) {
      await this.prisma.workingDayConfiguration.create({
        data: {
          dayOfWeek,
          status: DEFAULT_OFF_DAYS_OF_WEEK.includes(dayOfWeek) ? WorkingDayType.OFF : WorkingDayType.WORKING,
        },
      });
    }

    return this.prisma.workingDayConfiguration.findMany({ orderBy: { dayOfWeek: 'asc' } });
  }

  async updateWorkingDay(dayOfWeek: number, status: WorkingDayType, actorId: number) {
    // Upsert so an unseeded calendar cannot make this fail.
    const config = await this.prisma.workingDayConfiguration.upsert({
      where: { dayOfWeek },
      update: { status },
      create: { dayOfWeek, status },
    });
    await this.auditService.log(actorId, 'WORKING_DAY_UPDATED', 'WorkingDayConfiguration', config.id, undefined, null, { dayOfWeek, status });
    return config;
  }

  async listHolidays() {
    return this.prisma.holidayOverride.findMany({ orderBy: { date: 'asc' } });
  }

  async createHoliday(data: { date: Date; name: string; status: WorkingDayType }, actorId: number) {
    const holiday = await this.prisma.holidayOverride.create({
      data: { ...data, date: this.toUtcDateOnly(data.date) },
    });
    await this.auditService.log(actorId, 'HOLIDAY_CREATED', 'HolidayOverride', holiday.id, undefined, null, { name: holiday.name });
    return holiday;
  }

  async removeHoliday(id: number, actorId: number) {
    const holiday = await this.prisma.holidayOverride.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Hari libur tidak ditemukan');
    await this.prisma.holidayOverride.delete({ where: { id } });
    await this.auditService.log(actorId, 'HOLIDAY_DELETED', 'HolidayOverride', id, undefined, null, { name: holiday.name });
    return { id };
  }

  // ------------------------------------------------------------------
  // Calendar resolution
  // ------------------------------------------------------------------

  async isWorkingDay(date: Date): Promise<boolean> {
    const offdays = await this.offdayDatesBetween(date, date);
    return !offdays.has(this.localDateKey(date));
  }

  /**
   * Resolve every off day in an inclusive date range in a single pass.
   *
   * Loads the weekly configuration and the holiday overrides once instead of
   * querying per date, which matters when rendering a month of daily periods.
   * A holiday override always wins over the weekly configuration, so a working
   * Saturday can be declared off and an off Sunday can be declared working.
   */
  async offdayDatesBetween(start: Date, end: Date): Promise<Set<string>> {
    const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const offdays = new Set<string>();

    if (rangeStart.getTime() > rangeEnd.getTime()) return offdays;

    const [configs, overrides] = await Promise.all([
      this.prisma.workingDayConfiguration.findMany(),
      this.prisma.holidayOverride.findMany({
        where: {
          date: {
            gte: this.toUtcDateOnly(rangeStart),
            lte: this.toUtcDateOnly(rangeEnd),
          },
        },
      }),
    ]);

    const weeklyOff = new Set<number>();
    if (configs.length === 0) {
      for (const day of DEFAULT_OFF_DAYS_OF_WEEK) weeklyOff.add(day);
    } else {
      for (const config of configs) {
        if (config.status === WorkingDayType.OFF) weeklyOff.add(config.dayOfWeek);
      }
    }

    const overrideByDate = new Map<string, WorkingDayType>();
    for (const override of overrides) {
      overrideByDate.set(this.utcDateKey(override.date), override.status as WorkingDayType);
    }

    const cursor = new Date(rangeStart);
    let guard = 0;
    while (cursor.getTime() <= rangeEnd.getTime() && guard < 1000) {
      const key = this.localDateKey(cursor);
      const override = overrideByDate.get(key);

      if (override) {
        if (override === WorkingDayType.OFF) offdays.add(key);
      } else if (weeklyOff.has(cursor.getDay())) {
        offdays.add(key);
      }

      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    return offdays;
  }

  /** Normalise to UTC midnight so it matches a Prisma `@db.Date()` column. */
  private toUtcDateOnly(date: Date): Date {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  private localDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Date-only columns come back from Prisma at UTC midnight. */
  private utcDateKey(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
