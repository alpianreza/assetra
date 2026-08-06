export interface NotificationProvider {
  send(recipient: string, subject: string, body: string): Promise<void>;
}
