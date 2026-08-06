import { Module } from '@nestjs/common';
import { ExportController, ReportsExportController } from './export.controller';
import { ExportService } from './export.service';
import { PrismaModule } from '../../database/prisma.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ReportsModule } from '../reports/reports.module';
import { BrandingModule } from '../branding/branding.module';

@Module({
  imports: [PrismaModule, ComplianceModule, ReportsModule, BrandingModule],
  controllers: [ExportController, ReportsExportController],
  providers: [ExportService],
})
export class ExportModule {}
