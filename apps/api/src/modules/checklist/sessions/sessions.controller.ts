import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ChecklistSessionsService } from './sessions.service';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../../auth/dto/user-response.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/sessions.dto';

@Controller('checklist-sessions')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ChecklistSessionsController {
  constructor(private readonly sessionsService: ChecklistSessionsService) {}

  @Get()
  @RequirePermissions('checklist_session.view')
  async list() {
    const data = await this.sessionsService.list();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('checklist_session.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.sessionsService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('checklist_session.manage')
  async create(@Body() dto: CreateSessionDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.sessionsService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('checklist_session.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSessionDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.sessionsService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('checklist_session.manage')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.sessionsService.remove(id, user.id);
    return { success: true, data };
  }
}