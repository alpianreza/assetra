import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { ComplianceReportService } from '../compliance-report.service';

@Injectable()
export class PdfGeneratorService {
  constructor(private readonly reportService: ComplianceReportService) {}

  async generateInventoryReport(inventoryId: number, templateId: number, periodKey: string, sessionId: number | null): Promise<Uint8Array> {
    const data = await this.reportService.getReportData(inventoryId, templateId, periodKey, sessionId);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText(data.header.organization.name, { x: 50, y: 800, size: 20, font: boldFont });
    page.drawText(`Checklist Report: ${data.header.template.name}`, { x: 50, y: 775, size: 12, font });
    page.drawText(`Inventory: ${data.header.inventory.assetCode}`, { x: 50, y: 760, size: 12, font });

    let y = 720;
    for (const ans of data.answers) {
      page.drawText(`${ans.questionText}: ${ans.status || 'Belum diisi'}`, { x: 50, y, size: 10, font });
      y -= 20;
    }

    return await pdfDoc.save();
  }

  async generateBatchInventoryReport(inventoryIds: number[], templateId: number, periodKey: string, sessionId: number | null): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    for (const inventoryId of inventoryIds) {
      const pdfBytes = await this.generateInventoryReport(inventoryId, templateId, periodKey, sessionId);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  }
}
