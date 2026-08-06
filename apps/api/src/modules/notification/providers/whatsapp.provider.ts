import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from './notification-provider.interface';

@Injectable()
export class WhatsAppProvider implements NotificationProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);

  async send(recipient: string, _subject: string, body: string): Promise<void> {
    this.logger.log(`Sending WhatsApp to ${recipient}: ${body}`);
    // Implement Fonnte API or similar here
  }
}
