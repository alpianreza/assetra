import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { SubmitChecklistDto } from './compliance.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';

@Controller('compliance')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get()
  @RequirePermissions('compliance.view')
  async overview() {
    const data = await this.complianceService.overview();
    return { success: true, data };
  }

  /**
   * Checklist calendar for one month. `ym` is YYYY-MM and defaults to the
   * current month.
   */
  @Get('inventory/:inventoryId/periods')
  @RequirePermissions('compliance.view')
  async periods(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query('ym') ym?: string,
  ) {
    const data = await this.complianceService.inventoryPeriods(inventoryId, ym);
    return { success: true, data };
  }

  @Get('inventory/:inventoryId/checklist')
  @RequirePermissions('compliance.view')
  async buildExecution(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query('templateId', ParseIntPipe) templateId: number,
    @Query('periodKey') periodKey: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const data = await this.complianceService.buildExecution(
      inventoryId,
      templateId,
      periodKey,
      sessionId ? Number(sessionId) : null,
    );
    return { success: true, data };
  }

  @Post('inventory/:inventoryId/checklist')
  @RequirePermissions('compliance.execute')
  async submit(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query('templateId', ParseIntPipe) templateId: number,
    @Body() dto: SubmitChecklistDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.complianceService.submit(
      inventoryId,
      templateId,
      dto.periodKey,
      dto.sessionId ?? null,
      dto.answers,
      user.id,
    );
    return { success: true, data };
  }

  @Get('inventory/:inventoryId/history')
  @RequirePermissions('compliance.view')
  async history(@Param('inventoryId', ParseIntPipe) inventoryId: number) {
    const data = await this.complianceService.history(inventoryId);
    return { success: true, data };
  }
}
