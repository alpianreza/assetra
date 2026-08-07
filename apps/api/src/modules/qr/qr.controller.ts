import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireAnyPermissions, RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { QrService } from './qr.service';
import { BatchQrDto, RegenerateQrDto } from './dto/qr.dto';

@Controller('qr')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('gallery')
  @RequirePermissions('qr.view')
  async getGallery() {
    return { success: true, data: await this.qrService.getGallery() };
  }

  @Post('regenerate')
  @RequirePermissions('qr.print')
  async regenerate(
    @Body() dto: RegenerateQrDto,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    return {
      success: true,
      data: await this.qrService.regenerate(dto.inventoryIds, user.id),
    };
  }

  @Get('inventory/:inventoryId/stored-image')
  @RequirePermissions('qr.view')
  async getStoredQrImage(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Res() res: Response,
  ) {
    const filePath = await this.qrService.getStoredQrPath(inventoryId);
    return res.sendFile(filePath);
  }

  @Get('inventory/:inventoryId')
  @RequirePermissions('qr.view')
  async getQrDetail(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @CurrentUser() user: SanitizedUserDto,
  ) {
    const data = await this.qrService.getQrDetail(inventoryId, user.id);
    return { success: true, data };
  }

  @Get('inventory/:inventoryId/image')
  @RequirePermissions('qr.view')
  async getQrImage(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Res() res: Response,
  ) {
    const dataUrl = await this.qrService.getQrImage(inventoryId, 'png');
    const img = Buffer.from(dataUrl.split(',')[1], 'base64');
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': img.length,
      'Cache-Control': 'no-store',
    });
    res.end(img);
  }

  @Get('inventory/:inventoryId/label')
  @RequirePermissions('qr.print')
  async getQrLabel(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Res() res: Response,
  ) {
    const svg = await this.qrService.generateQrLabelSvg(inventoryId);
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    res.end(svg);
  }

  @Post('batch')
  @RequirePermissions('qr.print')
  async getBatchQr(@Body() dto: BatchQrDto) {
    const data = await this.qrService.getBatchQr(dto.inventoryIds);
    return { success: true, data };
  }
}

@Controller('public')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PublicController {
  constructor(private readonly qrService: QrService) {}

  @Get('inventory/:publicId')
  @RequireAnyPermissions('inventory.view', 'compliance.view', 'compliance.execute')
  async getPublicInventory(@Param('publicId') publicId: string) {
    const data = await this.qrService.getPublicInventory(publicId);
    return { success: true, data };
  }
}
