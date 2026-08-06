import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { mkdirSync } from 'fs';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { InventoryService } from './inventory.service';
import { InventoryQrService } from './inventory-qr.service';
import { InventoryMediaService } from './inventory-media.service';
import {
  CreateInventoryDto,
  UpdateInventoryDto,
  UpdateInventoryStatusDto,
  QueryInventoryDto,
  PreviewAssetCodeDto,
} from './inventory.dto';

const INVENTORY_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('inventory')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryQrService: InventoryQrService,
    private readonly inventoryMediaService: InventoryMediaService,
  ) {}

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

  @Get(':id/photo')
  @RequireAnyPermissions('inventory.view', 'compliance.view', 'compliance.execute')
  async getPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const filePath = await this.inventoryMediaService.getPhotoPath(id);
    return res.sendFile(filePath);
  }

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
    const inventory = await this.inventoryService.create(dto, user.id);
    try {
      const qrImage = await this.inventoryQrService.generateAndStore(inventory.id);
      return { success: true, data: { ...inventory, qrImage, qrGenerated: true } };
    } catch (error) {
      // The inventory already exists. Report the QR failure without turning the
      // whole request into a retry that could create a duplicate inventory.
      this.logger.error(`QR generation failed for inventory ${inventory.id}`, error instanceof Error ? error.stack : String(error));
      return { success: true, data: { ...inventory, qrImage: null, qrGenerated: false } };
    }
  }

  @Post(':id/photo')
  @RequireAnyPermissions('inventory.create', 'inventory.update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const directory = path.join(process.cwd(), 'storage', 'inventory');
          mkdirSync(directory, { recursive: true });
          callback(null, directory);
        },
        filename: (_req, file, callback) => {
          const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
          callback(null, `${crypto.randomBytes(16).toString('hex')}${extension}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (!INVENTORY_PHOTO_MIMES.includes(file.mimetype)) {
          return callback(new Error('Hanya gambar JPEG, PNG, atau WebP yang diperbolehkan'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    if (!file) throw new BadRequestException('File foto tidak ditemukan');
    const data = await this.inventoryMediaService.setPhoto(id, file.filename, user.id);
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
