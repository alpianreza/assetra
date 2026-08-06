import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  UpdateInventoryStatusDto,
  QueryInventoryDto,
  PreviewAssetCodeDto,
} from './inventory.dto';

@Controller('inventory')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('inventory.view')
  async list(@Query() query: QueryInventoryDto) {
    const data = await this.inventoryService.list(query);
    return { success: true, data };
  }

  @Get('preview-asset-code')
  @RequirePermissions('inventory.create')
  async previewAssetCode(@Query() query: PreviewAssetCodeDto) {
    const data = await this.inventoryService.previewNextAssetCode(query.itemTypeId);
    return { success: true, data };
  }

  /**
   * Inventory detail is also the landing page after a QR scan. Admin, PIC, and
   * auditors need the basic asset information even when they cannot list all
   * inventories.
   */
  @Get(':id')
  @RequireAnyPermissions('inventory.view', 'compliance.view', 'compliance.execute')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.inventoryService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('inventory.create')
  async create(
    @Body() dto: CreateInventoryDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.inventoryService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('inventory.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.inventoryService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @RequirePermissions('inventory.update')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryStatusDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.inventoryService.updateStatus(id, dto.status, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('inventory.delete')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.inventoryService.remove(id, user.id);
    return { success: true, data };
  }
}
