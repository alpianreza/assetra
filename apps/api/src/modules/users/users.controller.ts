import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { mkdirSync } from 'fs';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SanitizedUserDto } from '../auth/dto/user-response.dto';
import { UsersService } from './users.service';
import { UsersMediaService } from './users-media.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, QueryUserDto } from './users.dto';

const USER_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
@Controller('users')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly usersMediaService: UsersMediaService) {}
  @Get() @RequirePermissions('users.view') async list(@Query() query: QueryUserDto) { return { success: true, data: await this.usersService.list(query) }; }
  @Get(':id/photo') @RequirePermissions('users.view') async getPhoto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) { return res.sendFile(await this.usersMediaService.getPhotoPath(id)); }
  @Get(':id') @RequirePermissions('users.view') async getById(@Param('id', ParseIntPipe) id: number) { return { success: true, data: await this.usersService.getById(id) }; }
  @Post() @RequirePermissions('users.create') async create(@Body() dto: CreateUserDto, @CurrentUser() user: SanitizedUserDto) { return { success: true, data: await this.usersService.create(dto, user.id) }; }
  @Post(':id/photo')
  @RequirePermissions('users.update')
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: (_req, _file, callback) => { const directory = path.join(process.cwd(), 'storage', 'users'); mkdirSync(directory, { recursive: true }); callback(null, directory); }, filename: (_req, file, callback) => callback(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase() || '.jpg'}`) }), fileFilter: (_req, file, callback) => USER_PHOTO_MIMES.includes(file.mimetype) ? callback(null, true) : callback(new Error('Hanya gambar JPEG, PNG, atau WebP yang diperbolehkan'), false), limits: { fileSize: 3 * 1024 * 1024 } }))
  async uploadPhoto(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: SanitizedUserDto) { if (!file) throw new BadRequestException('File foto tidak ditemukan'); return { success: true, data: await this.usersMediaService.setPhoto(id, file.filename, user.id) }; }
  @Patch(':id') @RequirePermissions('users.update') async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @CurrentUser() user: SanitizedUserDto) { return { success: true, data: await this.usersService.update(id, dto, user.id) }; }
  @Patch(':id/status') @RequirePermissions('users.update') async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto, @CurrentUser() user: SanitizedUserDto) { return { success: true, data: await this.usersService.updateStatus(id, dto.status, user.id) }; }
  @Delete(':id') @RequirePermissions('users.delete') async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUserDto) { return { success: true, data: await this.usersService.remove(id, user.id) }; }
}
