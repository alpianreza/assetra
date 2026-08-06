import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { SettingsService } from './settings.service';
import { UpdateWorkingDayDto, CreateHolidayOverrideDto, UpdateOrganizationDto } from './settings.dto';

@Controller('settings')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('organization')
  @RequirePermissions('settings.organization.view')
  async getOrganization() {
    return { success: true, data: await this.service.getOrganization() };
  }

  @Patch('organization')
  @RequirePermissions('settings.organization.manage')
  async updateOrganization(@Body() dto: UpdateOrganizationDto, @CurrentUser() user: SanitizedUserDto) {
    return { success: true, data: await this.service.updateOrganization(dto, user.id) };
  }

  @Get('working-days')
  @RequirePermissions('settings.working_day.manage')
  async getWorkingDays() {
    return { success: true, data: await this.service.getWorkingDays() };
  }

  @Patch('working-days/:day')
  @RequirePermissions('settings.working_day.manage')
  async updateWorkingDay(
    @Param('day', ParseIntPipe) day: number,
    @Body() dto: UpdateWorkingDayDto,
    @CurrentUser() user: SanitizedUserDto
  ) {
    return { success: true, data: await this.service.updateWorkingDay(day, dto.status, user.id) };
  }

  @Get('holidays')
  @RequirePermissions('settings.holiday.manage')
  async listHolidays() {
    return { success: true, data: await this.service.listHolidays() };
  }

  @Post('holidays')
  @RequirePermissions('settings.holiday.manage')
  async createHoliday(@Body() dto: CreateHolidayOverrideDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.service.createHoliday({ ...dto, date: new Date(dto.date) }, user.id);
    return { success: true, data };
  }

  @Delete('holidays/:id')
  @RequirePermissions('settings.holiday.manage')
  async removeHoliday(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    return { success: true, data: await this.service.removeHoliday(id, user.id) };
  }
}
