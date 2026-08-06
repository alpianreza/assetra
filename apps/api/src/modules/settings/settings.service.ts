import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { WorkingDayType, UpdateOrganizationDto } from './settings.dto';

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
    return this.prisma.workingDayConfiguration.findMany({ orderBy: { dayOfWeek: 'asc' } });
  }

  async updateWorkingDay(dayOfWeek: number, status: WorkingDayType, actorId: number) {
    const config = await this.prisma.workingDayConfiguration.update({
      where: { dayOfWeek },
      data: { status },
    });
    await this.auditService.log(actorId, 'WORKING_DAY_UPDATED', 'WorkingDayConfiguration', config.id, undefined, null, { dayOfWeek, status });
    return config;
  }

  async listHolidays() {
    return this.prisma.holidayOverride.findMany({ orderBy: { date: 'asc' } });
  }

  async createHoliday(data: { date: Date; name: string; status: WorkingDayType }, actorId: number) {
    const holiday = await this.prisma.holidayOverride.create({ data });
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

  async isWorkingDay(date: Date): Promise<boolean> {
    // 1. Override check
    const override = await this.prisma.holidayOverride.findUnique({ where: { date } });
    if (override) return override.status === WorkingDayType.WORKING;

    // 2. Weekday check
    const dayOfWeek = date.getDay(); // 0-6
    const config = await this.prisma.workingDayConfiguration.findUnique({ where: { dayOfWeek } });
    return config?.status === WorkingDayType.WORKING;
  }
}
