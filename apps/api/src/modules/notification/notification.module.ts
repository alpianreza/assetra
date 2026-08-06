import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ReminderEngine } from './reminder-engine.service';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [forwardRef(() => ComplianceModule)],
  controllers: [],
  providers: [NotificationService, ReminderEngine, WhatsAppProvider, EmailProvider],
  exports: [NotificationService, ReminderEngine, WhatsAppProvider, EmailProvider],
})
export class NotificationModule {}