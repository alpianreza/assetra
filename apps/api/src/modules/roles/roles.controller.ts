import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './roles.dto';

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @RequirePermissions('roles.view')
  async list() {
    const data = await this.rolesService.list();
    return { success: true, data };
  }

  @Get('roles/:id')
  @RequirePermissions('roles.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.rolesService.getById(id);
    return { success: true, data };
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.rolesService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.rolesService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.manage')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.rolesService.remove(id, user.id);
    return { success: true, data };
  }

  @Get('permissions')
  @RequirePermissions('roles.view')
  async permissionCatalog() {
    const data = await this.rolesService.permissionCatalog();
    return { success: true, data };
  }
}
