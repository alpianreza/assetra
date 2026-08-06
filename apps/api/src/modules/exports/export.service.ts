import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../database/prisma.service';
import { ComplianceReportService } from '../reports/compliance-report.service';
import { BrandingService } from '../branding/branding.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ComplianceReportService,
    private readonly brandingService: BrandingService,
  ) {}

  async exportInventory(): Promise<Buffer> {
    const inventories = await this.prisma.complianceInventory.findMany({
      include: { category: true, area: true, itemType: true },
    });
    const worksheet = XLSX.utils.json_to_sheet(inventories.map(i => ({
      AssetCode: i.assetCode,
      Category: i.category?.name,
      Area: i.area?.name,
      ItemType: i.itemType?.name,
      Status: i.status,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportCompliance(inventoryIds: number[], templateId: number, periodKey: string, sessionId: number | null): Promise<Buffer> {
    const reportRows: any[] = [];
    const branding = await this.brandingService.getBranding();
    for (const inventoryId of inventoryIds) {
      const report = await this.reportService.getReportData(inventoryId, templateId, periodKey, sessionId);
      const header = report.header ?? {};
      const rows = (report.answers || []).map((a: any) => ({
        Organization: branding?.name ?? '',
        AssetCode: header.inventory?.assetCode ?? '',
        Template: header.template?.name ?? '',
        Period: header.period?.key ?? periodKey,
        Question: a?.questionText ?? '',
        Status: a?.status ?? '',
        Remark: a?.remark ?? '',
      }));
      reportRows.push(...rows);
    }
    const worksheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compliance');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
