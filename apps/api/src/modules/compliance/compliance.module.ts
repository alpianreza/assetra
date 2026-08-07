import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { ChecklistExecutionService } from './checklist-execution.service';
import { ComplianceResultsService } from './compliance-results.service';
import { ComplianceEvidenceService } from './compliance-evidence.service';
import { CompliancePeriodEngine } from './period-engine.service';
import { SettingsModule } from '../settings/settings.module';
@Module({ imports: [SettingsModule], controllers: [ComplianceController], providers: [ComplianceService, ChecklistExecutionService, ComplianceResultsService, ComplianceEvidenceService, CompliancePeriodEngine], exports: [ComplianceService, CompliancePeriodEngine] })
export class ComplianceModule {}
