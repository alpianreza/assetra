import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { SettingsService } from './settings.service';
import { UpdateWorkingDayDto, CreateHolidayOverrideDto, UpdateOrganizationDto } from './settings.dto';

const COMPANY_LOGO_MIMES = ['image/jpeg', 'image/png'];

@Controller('settings')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('organization')
  @RequirePermissions('settings.organization.view')
  async getOrganization() {
    return { success: true, data: await this.service.getOrganization() };
  }

  @Get('organization/logo')
  @RequirePermissions('settings.organization.view')
  async getOrganizationLogo(@Res() res: Response) {
    return res.sendFile(await this.service.getOrganizationLogoPath());
  }

  @Patch('organization')
  @RequirePermissions('settings.organization.manage')
  async updateOrganization(@Body() dto: UpdateOrganizationDto, @CurrentUser() user: SanitizedUserDto) {
    return { success: true, data: await this.service.updateOrganization(dto, user.id) };
  }

  @Post('organization/logo')
  @RequirePermissions('settings.organization.manage')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (_req, file, callback) => {
        if (!COMPANY_LOGO_MIMES.includes(file.mimetype)) {
          return callback(new Error('Logo harus berupa PNG atau JPEG'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadOrganizationLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    if (!file) throw new BadRequestException('File logo tidak ditemukan');
    return { success: true, data: await this.service.updateOrganizationLogo(file, user.id) };
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
    @CurrentUser() user: SanitizedUserDto,
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
