import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';
import { User } from '@prisma/client';

export interface SessionData {
  id: number;
  tokenHash: string;
  userId: number;
  expires: Date;
  user?: User;
}

export interface CreatedSession {
  rawToken: string;
  expires: Date;
}

@Injectable()
export class SessionService implements OnModuleInit {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('SessionService initialized');
  }

  generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async createSession(userId: number, expires: Date, ipAddress?: string, userAgent?: string): Promise<CreatedSession> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.session.create({
      data: {
        tokenHash,
        userId,
        expires,
        ipAddress,
        userAgent,
      },
    });

    this.logger.debug(`Session created for user ${userId}`);
    return { rawToken, expires };
  }

  async findSession(rawToken: string): Promise<SessionData | null> {
    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expires < new Date()) {
      await this.deleteSession(rawToken);
      return null;
    }

    return session;
  }

  async deleteSession(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.session.delete({
      where: { tokenHash },
    }).catch(() => {});
  }

  async revokeAllUserSessions(userId: number): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { userId },
    });
    this.logger.log(`Revoked ${result.count} sessions for user ${userId}`);
    return result.count;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const result = await this.prisma.session.deleteMany({
      where: { expires: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }
  }
}