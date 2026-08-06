import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, QueryUserDto } from './users.dto';

@Controller('users')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  async list(@Query() query: QueryUserDto) {
    const data = await this.usersService.list(query);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('users.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.usersService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('users.create')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.usersService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.usersService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @RequirePermissions('users.update')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.usersService.updateStatus(id, dto.status, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.usersService.remove(id, user.id);
    return { success: true, data };
  }
}
