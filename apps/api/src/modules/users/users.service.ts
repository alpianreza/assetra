import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../auth/audit.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './users.dto';

export const SUPER_ADMIN_ROLE = 'Super Admin';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  async list(query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { username: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.roleId) {
      where.userRoleAssignments = { some: { roleId: query.roleId } };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: { userRoleAssignments: { include: { role: true } } },
      }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email ?? '',
        status: u.status,
        roles: u.userRoleAssignments.map((ura) => ({ id: ura.role.id, name: ura.role.name })),
        createdAt: u.createdAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoleAssignments: {
          include: {
            role: { include: { rolePermissionAssignments: { include: { permission: true } } } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    const permissions = new Set<string>();
    for (const ura of user.userRoleAssignments) {
      for (const rpa of ura.role.rolePermissionAssignments) {
        permissions.add(rpa.permission.name);
      }
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email ?? '',
      phone: user.phone ?? '',
      status: user.status,
      createdAt: user.createdAt,
      roles: user.userRoleAssignments.map((ura) => ({ id: ura.role.id, name: ura.role.name })),
      permissions: Array.from(permissions),
    };
  }

  async create(dto: CreateUserDto, actorId: number) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, ...(dto.email ? [{ email: dto.email }] : [])] },
    });
    if (existing) {
      if (existing.username === dto.username) {
        throw new ConflictException('Username sudah digunakan');
      }
      throw new ConflictException('Email sudah digunakan');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const roleIds = dto.roleIds ?? [];

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        passwordHash,
        status: dto.status ?? 'active',
        userRoleAssignments: roleIds.length
          ? { create: roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: { userRoleAssignments: { include: { role: true } } },
    });

    await this.auditService.log(actorId, 'USER_CREATED', 'User', user.id, undefined, null, {
      username: user.username,
    });

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email ?? '',
      status: user.status,
      roles: user.userRoleAssignments.map((ura) => ({ id: ura.role.id, name: ura.role.name })),
    };
  }

  async update(id: number, dto: UpdateUserDto, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    // Unique checks (excluding self)
    if (dto.username || dto.email) {
      const dup = await this.prisma.user.findFirst({
        where: {
          OR: [
            ...(dto.username ? [{ username: dto.username }] : []),
            ...(dto.email ? [{ email: dto.email }] : []),
          ],
          NOT: { id },
        },
      });
      if (dup) {
        if (dto.username && dup.username === dto.username) {
          throw new ConflictException('Username sudah digunakan');
        }
        throw new ConflictException('Email sudah digunakan');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email ?? null;
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.status !== undefined) data.status = dto.status;
    // Only re-hash when a new password is supplied.
    if (dto.password) {
      data.passwordHash = await this.passwordService.hash(dto.password);
    }

    if (dto.roleIds !== undefined) {
      await this.prisma.userRoleAssignment.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length) {
        await this.prisma.userRoleAssignment.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { userRoleAssignments: { include: { role: true } } },
    });

    await this.auditService.log(actorId, 'USER_UPDATED', 'User', id, undefined, null, {
      username: updated.username,
    });

    return {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      email: updated.email ?? '',
      status: updated.status,
      roles: updated.userRoleAssignments.map((ura) => ({ id: ura.role.id, name: ura.role.name })),
    };
  }

  async updateStatus(id: number, status: string, actorId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    // Prevent self deactivation (would lock the admin out).
    if (id === actorId && status === 'inactive') {
      throw new BadRequestException('Tidak dapat menonaktifkan akun sendiri');
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { status } });
    await this.auditService.log(actorId, 'USER_STATUS_CHANGED', 'User', id, undefined, null, { status });

    return { id: updated.id, status: updated.status };
  }

  async remove(id: number, actorId: number) {
    if (id === actorId) {
      throw new BadRequestException('Tidak dapat menghapus akun sendiri');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoleAssignments: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan');

    // Prevent deleting the last Super Admin.
    const isSuperAdmin = user.userRoleAssignments.some((ura) => ura.role.name === SUPER_ADMIN_ROLE);
    if (isSuperAdmin) {
      const superAdminCount = await this.prisma.user.count({
        where: {
          userRoleAssignments: { some: { role: { name: SUPER_ADMIN_ROLE } } },
        },
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenException('Tidak dapat menghapus administrator terakhir');
      }
    }

    // Business-relation safety: reject hard delete if user is a PIC.
    const picCount = await this.prisma.inventoryPicAssignment.count({ where: { userId: id } });
    if (picCount > 0) {
      throw new ConflictException('Pengguna masih digunakan sebagai PIC dan tidak dapat dihapus');
    }

    await this.prisma.user.delete({ where: { id } });
    await this.auditService.log(actorId, 'USER_DELETED', 'User', id, undefined, null, {
      username: user.username,
    });

    return { id };
  }

  // Used internally (e.g. create-admin bootstrap).
  async createWithRoles(data: {
    name: string;
    username: string;
    email?: string;
    phone?: string;
    password: string;
    roleNames: string[];
  }) {
    const passwordHash = await this.passwordService.hash(data.password);
    return this.prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email ?? null,
        phone: data.phone ?? null,
        passwordHash,
        status: 'active',
        userRoleAssignments: {
          create: data.roleNames.map((roleName) => ({ role: { connect: { name: roleName } } })),
        },
      },
    });
  }
}
