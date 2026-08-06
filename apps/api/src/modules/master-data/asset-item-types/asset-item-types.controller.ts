import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../../auth/dto/user-response.dto';
import { AssetItemTypesService } from './asset-item-types.service';
import { CreateAssetItemTypeDto, UpdateAssetItemTypeDto } from './asset-item-types.dto';

@Controller('master/asset-item-types')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class AssetItemTypesController {
  constructor(private readonly service: AssetItemTypesService) {}

  @Get()
  @RequirePermissions('master.item_type.view')
  async list() {
    const data = await this.service.list();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('master.item_type.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.service.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('master.item_type.manage')
  async create(@Body() dto: CreateAssetItemTypeDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.service.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('master.item_type.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetItemTypeDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.service.update(id, dto, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('master.item_type.manage')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.service.remove(id, user.id);
    return { success: true, data };
  }
}
