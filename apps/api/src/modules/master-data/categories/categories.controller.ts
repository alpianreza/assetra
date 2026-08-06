import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../../auth/dto/user-response.dto';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Controller('master/categories')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('master.category.view')
  async list() {
    const data = await this.categoriesService.list();
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions('master.category.view')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.categoriesService.getById(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions('master.category.manage')
  async create(@Body() dto: CreateCategoryDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.categoriesService.create(dto, user.id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermissions('master.category.manage')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.categoriesService.update(id, dto, user.id);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions('master.category.manage')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    const data = await this.categoriesService.remove(id, user.id);
    return { success: true, data };
  }
}