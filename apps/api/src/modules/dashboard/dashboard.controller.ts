import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions('dashboard.view')
  async getSummary(@Query('areaId') areaId?: string, @Query('categoryId') categoryId?: string) {
    const filters = {
      areaId: areaId ? parseInt(areaId) : undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
    };
    return {
      success: true,
      data: {
        summary: await this.dashboardService.getSummary(filters),
        compliance: await this.dashboardService.getComplianceStatus(filters),
        breakdowns: await this.dashboardService.getBreakdowns(filters),
      },
    };
  }
}
