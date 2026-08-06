import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../../auth/dto/user-response.dto';
import { AreasService } from './areas.service';
import { CreateAreaDto, UpdateAreaDto } from './areas.dto';

@Controller('master/areas')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  @RequirePermissions('master.area.view')
  async list() {
    const data = await this.areasService.list();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('master.area.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.areasService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('master.area.manage')
  async create(@Body() dto: CreateAreaDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.areasService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('master.area.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAreaDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.areasService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('master.area.manage')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.areasService.remove(id, user.id);
    return { success: true, data };
  }
}
