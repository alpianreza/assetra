import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from './notification-provider.interface';

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);

  async send(recipient: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Sending Email to ${recipient} [Subject: ${subject}]: ${body}`);
    // Implement SMTP transporter here
  }
}
