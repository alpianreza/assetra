import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ChecklistTemplatesService } from './templates.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { CreateChecklistTemplateDto, UpdateChecklistTemplateDto, UpdateTemplateQuestionsDto, ReorderQuestionsDto, AssignTemplateSessionDto, AssignInventoryTemplateDto } from './dto/checklist.dto';

@Controller('checklist-templates')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ChecklistTemplatesController {
  constructor(private readonly templatesService: ChecklistTemplatesService) {}

  @Get()
  @RequirePermissions('checklist_template.view')
  async list() {
    const data = await this.templatesService.list();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('checklist_template.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.templatesService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('checklist_template.create')
  async create(@Body() dto: CreateChecklistTemplateDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('checklist_template.update')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChecklistTemplateDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Patch(':id/questions')
  @RequirePermissions('checklist_template.update')
  async updateQuestions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateQuestionsDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.updateQuestions(id, dto, user.id);
    return { success: true, data };
  }

  @Patch(':id/questions/reorder')
  @RequirePermissions('checklist_template.update')
  async reorderQuestions(@Param('id', ParseIntPipe) id: number, @Body() dto: ReorderQuestionsDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.reorderQuestions(id, dto, user.id);
    return { success: true, data };
  }

  @Patch(':id/sessions')
  @RequirePermissions('checklist_template.update')
  async updateSessions(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignTemplateSessionDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.updateSessions(id, dto, user.id);
    return { success: true, data };
  }

  @Post(':id/inventories')
  @RequirePermissions('checklist_template.update')
  async assignInventories(@Param('id', ParseIntPipe) templateId: number, @Body() dto: AssignInventoryTemplateDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.assignInventories({ ...dto, templateId }, user.id);
    return { success: true, data };
  }

  @Delete(':id/inventories')
  @RequirePermissions('checklist_template.update')
  async unassignInventories(@Param('id', ParseIntPipe) templateId: number, @Body() dto: { inventoryIds: number[] }, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.unassignInventories(templateId, dto.inventoryIds, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('checklist_template.delete')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.templatesService.remove(id, user.id);
    return { success: true, data };
  }
}