import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { AuditService } from './audit.service';
import { SanitizedUserDto } from './dto/user-response.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(identifier: string, password: string, ipAddress?: string): Promise<{ user: User; rawToken: string } | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
      include: {
        userRoleAssignments: {
          include: {
            role: {
              include: {
                rolePermissionAssignments: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found for identifier "${identifier}"`);
      await this.auditService.log(null, 'LOGIN_FAILED', 'User', undefined, ipAddress, null, { identifier });
      return null;
    }

    if (user.status !== 'active') {
      this.logger.warn(`Login failed: User "${identifier}" is inactive`);
      await this.auditService.log(user.id, 'LOGIN_FAILED', 'User', user.id, ipAddress, null, { identifier });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password for user "${identifier}"`);
      await this.auditService.log(user.id, 'LOGIN_FAILED', 'User', user.id, ipAddress, null, { identifier });
      return null;
    }

    const session = await this.sessionService.createSession(user.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), ipAddress);

    this.logger.log(`Login successful for user ${user.id} (${user.username})`);
    await this.auditService.log(user.id, 'LOGIN_SUCCESS', 'User', user.id, ipAddress, null, { username: user.username });

    return { user, rawToken: session.rawToken };
  }

  async getUserWithPermissions(userId: number): Promise<SanitizedUserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoleAssignments: {
          include: {
            role: {
              include: {
                rolePermissionAssignments: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const permissions = new Set<string>();
    for (const ura of user.userRoleAssignments) {
      for (const rpa of ura.role.rolePermissionAssignments) {
        permissions.add(rpa.permission.name);
      }
    }

    const roles = [...new Set(user.userRoleAssignments.map(ura => ura.role.name))];

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email ?? '',
      roles,
      permissions: Array.from(permissions),
    };
  }

  async getCurrentUser(userId: number): Promise<SanitizedUserDto | null> {
    return this.getUserWithPermissions(userId);
  }

  async logout(sessionToken: string, ipAddress?: string): Promise<void> {
    const session = await this.sessionService.findSession(sessionToken);
    if (session) {
      await this.auditService.log(session.userId, 'LOGOUT', 'Session', session.id, ipAddress);
    }
    await this.sessionService.deleteSession(sessionToken);
  }

  async getSessionUser(sessionToken: string): Promise<SanitizedUserDto | null> {
    const session = await this.sessionService.findSession(sessionToken);
    if (!session) return null;
    return this.getUserWithPermissions(session.userId);
  }
}