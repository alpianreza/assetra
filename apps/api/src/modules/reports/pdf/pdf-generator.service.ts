import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { ComplianceReportService } from '../compliance-report.service';
import { BrandingService } from '../../branding/branding.service';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 38;

@Injectable()
export class PdfGeneratorService {
  constructor(
    private readonly reportService: ComplianceReportService,
    private readonly brandingService: BrandingService,
  ) {}

  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const words = String(text || '-').split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ['-'];
  }

  private drawCell(page: PDFPage, x: number, y: number, width: number, height: number, fill?: { r: number; g: number; b: number }) {
    page.drawRectangle({ x, y: y - height, width, height, borderColor: rgb(0.15, 0.18, 0.22), borderWidth: 0.55, color: fill ? rgb(fill.r, fill.g, fill.b) : undefined });
  }

  private async createReportDocument(data: any): Promise<PDFDocument> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const branding = await this.brandingService.getBranding();

    let logo: any = null;
    if (branding.logoPath) {
      const filePath = path.resolve(process.cwd(), branding.logoPath);
      if (existsSync(filePath)) {
        const bytes = readFileSync(filePath);
        try { logo = branding.logoPath.toLowerCase().endsWith('.png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes); } catch { logo = null; }
      }
    }

    let page = pdf.addPage(A4);
    let y = 804;
    const contentWidth = A4[0] - MARGIN * 2;

    const drawHeader = () => {
      if (logo) {
        const scale = Math.min(62 / logo.width, 44 / logo.height);
        page.drawImage(logo, { x: MARGIN, y: 782, width: logo.width * scale, height: logo.height * scale });
      }
      const company = branding.name || data.header.organization.name || 'Assetra';
      const companyWidth = bold.widthOfTextAtSize(company, 14);
      page.drawText(company, { x: (A4[0] - companyWidth) / 2, y: 808, size: 14, font: bold });
      const title = `CHECKLIST PENGECEKAN ${(data.header.inventory.itemTypeName || data.header.template.name || '').toUpperCase()}`;
      const titleSize = title.length > 62 ? 10 : 12;
      const titleWidth = bold.widthOfTextAtSize(title, titleSize);
      page.drawText(title, { x: Math.max(MARGIN + 70, (A4[0] - titleWidth) / 2), y: 789, size: titleSize, font: bold });
      page.drawLine({ start: { x: MARGIN, y: 775 }, end: { x: A4[0] - MARGIN, y: 775 }, thickness: 1.5, color: rgb(0.04, 0.37, 0.23) });
      y = 758;
    };

    const newPage = () => { page = pdf.addPage(A4); drawHeader(); };
    drawHeader();

    const info = [
      ['Periode', data.header.period.label],
      ['No. Inventaris', data.header.inventory.assetCode],
      ['Area', [data.header.inventory.areaName, data.header.inventory.specificArea].filter(Boolean).join(' / ') || '-'],
      ['Kategori', data.header.inventory.categoryName || '-'],
      ['PIC', data.header.pics.map((pic: any) => pic.name).join(', ') || '-'],
      ['Sesi', data.header.session?.name || '-'],
    ];
    const infoCol = contentWidth / 2;
    info.forEach((entry, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + col * infoCol;
      const rowY = y - row * 24;
      page.drawText(`${entry[0]}:`, { x, y: rowY, size: 8, font: bold });
      page.drawText(String(entry[1]), { x: x + 70, y: rowY, size: 8, font: regular, maxWidth: infoCol - 74 });
    });
    y -= 78;

    const widths = [28, 295, 62, contentWidth - 385];
    const headers = ['NO', 'ITEM PENGECEKAN', 'HASIL', 'KETERANGAN'];
    let x = MARGIN;
    headers.forEach((header, index) => {
      this.drawCell(page, x, y, widths[index], 24, { r: 0.93, g: 0.95, b: 0.94 });
      page.drawText(header, { x: x + 4, y: y - 15, size: 7.5, font: bold });
      x += widths[index];
    });
    y -= 24;

    data.answers.forEach((answer: any, index: number) => {
      const questionLines = this.wrap(answer.questionText, regular, 8, widths[1] - 8);
      const remarkLines = this.wrap(answer.remark || '-', regular, 7.5, widths[3] - 8);
      const rowHeight = Math.max(24, Math.max(questionLines.length, remarkLines.length) * 10 + 8);
      if (y - rowHeight < 88) {
        newPage();
        x = MARGIN;
        headers.forEach((header, headerIndex) => { this.drawCell(page, x, y, widths[headerIndex], 24, { r: 0.93, g: 0.95, b: 0.94 }); page.drawText(header, { x: x + 4, y: y - 15, size: 7.5, font: bold }); x += widths[headerIndex]; });
        y -= 24;
      }
      const status = answer.status === 'ok' ? 'OK' : answer.status === 'not_ok' ? 'NOT OK' : answer.status === 'na' ? 'N/A' : '-';
      x = MARGIN;
      widths.forEach(width => { this.drawCell(page, x, y, width, rowHeight); x += width; });
      page.drawText(String(index + 1), { x: MARGIN + 9, y: y - 15, size: 8, font: regular });
      questionLines.forEach((line, lineIndex) => page.drawText(line, { x: MARGIN + widths[0] + 4, y: y - 13 - lineIndex * 10, size: 8, font: regular }));
      const statusX = MARGIN + widths[0] + widths[1] + 5;
      page.drawText(status, { x: statusX, y: y - 15, size: status === 'NOT OK' ? 7 : 8, font: bold, color: answer.status === 'not_ok' ? rgb(0.75, 0.08, 0.08) : rgb(0.08, 0.32, 0.18) });
      const remarkX = MARGIN + widths[0] + widths[1] + widths[2] + 4;
      remarkLines.forEach((line, lineIndex) => page.drawText(line, { x: remarkX, y: y - 13 - lineIndex * 10, size: 7.5, font: regular }));
      y -= rowHeight;
    });

    y -= 12;
    if (y < 150) newPage();
    page.drawText('Keterangan: OK = sesuai, NOT OK = tidak sesuai, N/A = tidak berlaku', { x: MARGIN, y, size: 7.5, font: regular });
    y -= 24;
    page.drawText(`Ringkasan: ${data.findings.okCount} sesuai | ${data.findings.notOkCount} temuan | ${data.findings.naCount} N/A | ${data.findings.unansweredCount} belum diisi`, { x: MARGIN, y, size: 8, font: bold });

    if (data.findings.notOkCount > 0) {
      y -= 22;
      page.drawText('DETAIL TEMUAN', { x: MARGIN, y, size: 10, font: bold, color: rgb(0.72, 0.08, 0.08) });
      for (const finding of data.answers.filter((answer: any) => answer.status === 'not_ok')) {
        y -= 15;
        if (y < 80) newPage();
        const lines = this.wrap(`- ${finding.questionText}${finding.remark ? `: ${finding.remark}` : ''}`, regular, 8, contentWidth);
        lines.forEach((line, index) => page.drawText(line, { x: MARGIN, y: y - index * 10, size: 8, font: regular }));
        y -= (lines.length - 1) * 10;
      }
    }

    const pages = pdf.getPages();
    pages.forEach((pdfPage, index) => {
      const footer = branding.reportFooter || `${branding.shortName || branding.name} - Dokumen checklist Assetra`;
      pdfPage.drawLine({ start: { x: MARGIN, y: 38 }, end: { x: A4[0] - MARGIN, y: 38 }, thickness: 0.4, color: rgb(0.6, 0.64, 0.68) });
      pdfPage.drawText(footer, { x: MARGIN, y: 24, size: 7, font: regular, color: rgb(0.38, 0.42, 0.46), maxWidth: contentWidth - 60 });
      pdfPage.drawText(`${index + 1}/${pages.length}`, { x: A4[0] - MARGIN - 24, y: 24, size: 7, font: regular });
    });
    return pdf;
  }

  async generateInventoryReport(inventoryId: number, templateId: number, periodKey: string, sessionId: number | null): Promise<Uint8Array> {
    const data = await this.reportService.getReportData(inventoryId, templateId, periodKey, sessionId);
    return (await this.createReportDocument(data)).save();
  }

  async generateBatchInventoryReport(inventoryIds: number[], templateId: number, periodKey: string, sessionId: number | null): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    for (const inventoryId of inventoryIds) {
      const pdfBytes = await this.generateInventoryReport(inventoryId, templateId, periodKey, sessionId);
      const source = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(source, source.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    return mergedPdf.save();
  }
}
