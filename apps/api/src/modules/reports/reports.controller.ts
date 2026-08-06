import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ComplianceReportService } from './compliance-report.service';
import { PdfGeneratorService } from './pdf/pdf-generator.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('reports')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly reportService: ComplianceReportService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  @Get('compliance/inventory/:inventoryId')
  @RequirePermissions('reports.view')
  async previewReport(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query() dto: any,
  ) {
    const data = await this.reportService.getReportData(
      inventoryId,
      Number(dto.templateId),
      dto.periodKey,
      dto.sessionId ? Number(dto.sessionId) : null,
    );
    return { success: true, data };
  }

  @Get('compliance/inventory/:inventoryId/pdf')
  @RequirePermissions('reports.export')
  async exportPdf(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Query() dto: any,
    @Res() res: Response,
  ) {
    const pdf = await this.pdfGenerator.generateInventoryReport(
      inventoryId,
      Number(dto.templateId),
      dto.periodKey,
      dto.sessionId ? Number(dto.sessionId) : null,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Checklist_${inventoryId}_${dto.periodKey}.pdf"`);
    res.end(Buffer.from(pdf));
  }

  @Post('compliance/batch/preview')
  @RequirePermissions('reports.view')
  async previewBatch(@Body() dto: any) {
    const reports = await Promise.all(
      dto.inventoryIds.map((id: number) =>
        this.reportService.getReportData(id, Number(dto.templateId), dto.periodKey, dto.sessionId ? Number(dto.sessionId) : null)
      )
    );
    return { success: true, data: reports };
  }

  @Post('compliance/batch/pdf')
  @RequirePermissions('reports.export')
  async exportBatchPdf(@Body() dto: any, @Res() res: Response) {
    const pdf = await this.pdfGenerator.generateBatchInventoryReport(
      dto.inventoryIds,
      Number(dto.templateId),
      dto.periodKey,
      dto.sessionId ? Number(dto.sessionId) : null,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Checklist_Batch_${dto.periodKey}.pdf"`);
    res.end(Buffer.from(pdf));
  }
}
