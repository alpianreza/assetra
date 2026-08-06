import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ComplianceResultsService } from './compliance-results.service';
import { CompliancePeriodEngine } from './period-engine.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceResultsService, CompliancePeriodEngine],
  exports: [ComplianceService, CompliancePeriodEngine],
})
export class ComplianceModule {}
