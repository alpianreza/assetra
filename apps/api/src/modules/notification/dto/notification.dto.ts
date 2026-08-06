import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsInt, IsOptional } from 'class-validator';

export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export class UpdatePreferenceDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}

export class SendReminderDto {
  @IsInt()
  inventoryId!: number;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;
}
