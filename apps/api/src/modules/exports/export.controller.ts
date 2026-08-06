import { Controller, Get, Post, Res, UseGuards, Body, Query } from '@nestjs/common';
import { ExportService } from './export.service';
import { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('inventory')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('export.xlsx')
  @RequirePermissions('inventory.view')
  async exportInventory(@Res() res: Response) {
    const buffer = await this.exportService.exportInventory();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.xlsx');
    res.send(buffer);
  }
}

@Controller('reports')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReportsExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('compliance/export.xlsx')
  @RequirePermissions('reports.export')
  async exportCompliance(@Body() dto: { inventoryIds: number[]; templateId: number; periodKey: string; sessionId?: number }, @Res() res: Response) {
    const buffer = await this.exportService.exportCompliance(dto.inventoryIds, dto.templateId, dto.periodKey, dto.sessionId ?? null);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=compliance.xlsx');
    res.send(buffer);
  }
}

