import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import * as path from 'path';
import { BrandingService } from './branding.service';

@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  async getBranding() {
    const branding = await this.brandingService.getBranding();
    const { logoPath: _logoPath, ...publicBranding } = branding;
    return { success: true, data: publicBranding };
  }

  @Get('logo')
  async getLogo(@Res() res: Response) {
    const branding = await this.brandingService.getBranding();
    if (!branding.logoPath) throw new NotFoundException('Logo perusahaan belum diatur');
    const filePath = path.resolve(process.cwd(), branding.logoPath);
    if (!existsSync(filePath)) throw new NotFoundException('File logo perusahaan tidak ditemukan');
    return res.sendFile(filePath);
  }
}
