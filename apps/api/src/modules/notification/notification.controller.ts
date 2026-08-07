import { Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';

@Controller('notifications')
@UseGuards(SessionAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@CurrentUser() user: SanitizedUserDto, @Query('limit') limit?: string, @Query('unreadOnly') unreadOnly?: string) {
    await this.notificationService.syncChecklistNotifications(user.id);
    return { success: true, data: await this.notificationService.listInApp(user.id, { limit: limit ? Number(limit) : 30, unreadOnly: unreadOnly === 'true' }) };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: SanitizedUserDto) {
    return { success: true, data: await this.notificationService.markAllRead(user.id) };
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: SanitizedUserDto, @Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.notificationService.markRead(user.id, id) };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: SanitizedUserDto, @Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.notificationService.removeInApp(user.id, id) };
  }
}
