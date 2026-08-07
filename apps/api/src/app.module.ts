import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { SettingsModule } from './modules/settings/settings.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { NotificationModule } from './modules/notification/notification.module';
import { QrModule } from './modules/qr/qr.module';
import { BrandingModule } from './modules/branding/branding.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { ExportModule } from './modules/exports/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(__dirname, '../../../.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    MasterDataModule,
    SettingsModule,
    InventoryModule,
    ChecklistModule,
    ComplianceModule,
    NotificationModule,
    QrModule,
    BrandingModule,
    ReportsModule,
    DashboardModule,
    EvidenceModule,
    ExportModule,
  ],
})
export class AppModule {}
