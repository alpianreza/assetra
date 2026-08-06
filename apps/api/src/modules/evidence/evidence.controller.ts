import { Controller, Post, Get, Delete, Param, ParseIntPipe, UseGuards, UseInterceptors, UploadedFile, Query, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EvidenceService } from './evidence.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';

@Controller('evidence')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('upload')
  @RequirePermissions('compliance.execute')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './storage/evidence',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const randomName = crypto.randomBytes(16).toString('hex');
          cb(null, `${randomName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(new Error('Hanya file gambar (JPEG, PNG, WebP) yang diperbolehkan'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadEvidence(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: SanitizedUserDto,
    @Query('checklistLogId') checklistLogId: string,
    @Query('inventoryId') inventoryId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    const evidence = await this.evidenceService.createEvidence({
      fileName: file.originalname,
      storageKey: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      checklistLogId: parseInt(checklistLogId),
      inventoryId: parseInt(inventoryId),
      uploadedById: user.id,
    });

    return { success: true, data: evidence };
  }

  @Get(':id')
  @RequirePermissions('compliance.execute')
  async getEvidence(@Param('id', ParseIntPipe) id: number) {
    return { success: true, data: await this.evidenceService.getEvidence(id) };
  }

  @Get('file/:id')
  async getEvidenceFile(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const evidence = await this.evidenceService.getEvidence(id);
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    const filePath = path.join(process.cwd(), 'storage', 'evidence', evidence.storageKey);
    res.sendFile(filePath);
  }

  @Delete(':id')
  @RequirePermissions('compliance.execute')
  async deleteEvidence(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) {
    return { success: true, data: await this.evidenceService.deleteEvidence(id, user.id) };
  }
}