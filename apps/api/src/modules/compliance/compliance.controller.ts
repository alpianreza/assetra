import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceResultsService } from './compliance-results.service';
import { SubmitChecklistDto } from './compliance.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';

@Controller('compliance')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly resultsService: ComplianceResultsService,
  ) {}

  @Get()
  @RequireAnyPermissions('compliance.view', 'compliance.execute')
  async overview() {
    const data = await this.complianceService.overview();
    return { success: true, data };
  }

  @Get('inventory/:inventoryId/periods')
  @RequireAnyPermissions('compliance.view', 'compliance.execute')
  async periods(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query('ym') ym?: string,
  ) {
    const data = await this.complianceService.inventoryPeriods(inventoryId, ym);
    return { success: true, data };
  }

  /** Only executors may load the editable form, not read-only auditors. */
  @Get('inventory/:inventoryId/checklist')
  @RequirePermissions('compliance.execute')
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

  @Get('inventory/:inventoryId/history/:occurrenceId')
  @RequirePermissions('compliance.view')
  async result(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Param('occurrenceId', ParseIntPipe) occurrenceId: number,
  ) {
    const data = await this.resultsService.getResult(inventoryId, occurrenceId);
    return { success: true, data };
  }

  @Get('inventory/:inventoryId/history')
  @RequirePermissions('compliance.view')
  async history(@Param('inventoryId', ParseIntPipe) inventoryId: number) {
    const data = await this.complianceService.history(inventoryId);
    return { success: true, data };
  }
}
