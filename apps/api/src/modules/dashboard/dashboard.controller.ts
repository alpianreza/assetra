import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';

@Controller('dashboard')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('home')
  async getHome(@CurrentUser() user: SanitizedUserDto, @Query('month') month?: string) {
    return { success: true, data: await this.dashboardService.getMyWork(user.id, month) };
  }

  @Get('summary')
  @RequirePermissions('dashboard.view')
  async getSummary(
    @CurrentUser() user: SanitizedUserDto,
    @Query('areaId') areaId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('month') month?: string,
  ) {
    const filters = {
      areaId: areaId ? parseInt(areaId, 10) : undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
    };
    const [summary, compliance, breakdowns, myWork] = await Promise.all([
      this.dashboardService.getSummary(filters),
      this.dashboardService.getComplianceStatus(filters),
      this.dashboardService.getBreakdowns(filters),
      this.dashboardService.getMyWork(user.id, month),
    ]);
    return { success: true, data: { summary, compliance, breakdowns, myWork } };
  }
}
