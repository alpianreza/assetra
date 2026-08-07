import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import * as path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class UsersMediaService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}
  private directory() { return path.join(process.cwd(), 'storage', 'users'); }
  async setPhoto(userId: number, fileName: string, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, photo: true } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');
    await this.prisma.user.update({ where: { id: userId }, data: { photo: fileName } });
    if (user.photo && user.photo !== fileName) await fs.unlink(path.join(this.directory(), path.basename(user.photo))).catch(() => undefined);
    await this.auditService.log(actorId, 'USER_PHOTO_CHANGED', 'User', userId, undefined, { photo: user.photo }, { photo: fileName });
    return { id: userId, photoUrl: `/api/v1/users/${userId}/photo?v=${Date.now()}` };
  }
  async getPhotoPath(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { photo: true } });
    if (!user?.photo) throw new NotFoundException('Foto pengguna tidak ditemukan');
    const filePath = path.join(this.directory(), path.basename(user.photo));
    try { await fs.access(filePath); } catch { throw new NotFoundException('File foto pengguna tidak ditemukan'); }
    return filePath;
  }
}
