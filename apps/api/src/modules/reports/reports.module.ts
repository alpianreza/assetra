import { Module } from '@nestjs/common';
import { ComplianceReportService } from './compliance-report.service';
import { PdfGeneratorService } from './pdf/pdf-generator.service';
import { ReportsController } from './reports.controller';
import { BrandingModule } from '../branding/branding.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [BrandingModule, ComplianceModule],
  controllers: [ReportsController],
  providers: [ComplianceReportService, PdfGeneratorService],
  exports: [ComplianceReportService, PdfGeneratorService],
})
export class ReportsModule {}