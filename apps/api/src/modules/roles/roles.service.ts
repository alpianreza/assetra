import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../auth/audit.service';
import { CreateRoleDto, UpdateRoleDto } from './roles.dto';

export const SUPER_ADMIN_ROLE = 'Super Admin';

/** Canonical group → permission slug prefixes for the permission catalog. */
export const PERMISSION_GROUPS: Record<string, string[]> = {
  users: ['users.view', 'users.create', 'users.update', 'users.delete'],
  roles: ['roles.view', 'roles.manage'],
  area: ['master.area.view', 'master.area.manage'],
  category: ['master.category.view', 'master.category.manage'],
  itemType: ['master.item_type.view', 'master.item_type.manage'],
  inventory: ['inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete'],
  checklistTemplate: ['checklist_template.view', 'checklist_template.create', 'checklist_template.update', 'checklist_template.delete'],
  checklistSession: ['checklist_session.view', 'checklist_session.manage'],
  compliance: ['compliance.view', 'compliance.execute', 'compliance.manage'],
  qr: ['qr.view', 'qr.print'],
  organization: ['settings.organization.view', 'settings.organization.manage'],
  reports: ['reports.view', 'reports.export'],
  dashboard: ['dashboard.view'],
  workingDay: ['settings.working_day.manage'],
  holiday: ['settings.holiday.manage'],
};

export const PERMISSION_CATALOG: string[] = Object.values(PERMISSION_GROUPS).flat();

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      include: {
        rolePermissionAssignments: { include: { permission: true } },
        userRoleAssignments: true,
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      system: role.name === SUPER_ADMIN_ROLE,
      permissions: role.rolePermissionAssignments.map((rpa) => rpa.permission.name),
      userCount: role.userRoleAssignments.length,
    }));
  }

  async getById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissionAssignments: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');

    return {
      id: role.id,
      name: role.name,
      system: role.name === SUPER_ADMIN_ROLE,
      permissions: role.rolePermissionAssignments.map((rpa) => rpa.permission.name),
    };
  }

  async create(dto: CreateRoleDto, actorId: number) {
    const name = dto.name.trim();
    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Nama role sudah digunakan');

    const role = await this.prisma.role.create({
      data: {
        name,
        rolePermissionAssignments: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
    });

    await this.auditService.log(actorId, 'ROLE_CREATED', 'Role', role.id, undefined, null, { name });

    return { id: role.id, name: role.name };
  }

  async update(id: number, dto: UpdateRoleDto, actorId: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new BadRequestException('Role Super Admin tidak dapat diubah');
    }

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      const dup = await this.prisma.role.findFirst({ where: { name: trimmed, NOT: { id } } });
      if (dup) throw new ConflictException('Nama role sudah digunakan');
      await this.prisma.role.update({ where: { id }, data: { name: trimmed } });
    }

    if (dto.permissionIds !== undefined) {
      await this.prisma.rolePermissionAssignment.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length) {
        await this.prisma.rolePermissionAssignment.createMany({
          data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }
    }

    await this.auditService.log(actorId, 'ROLE_UPDATED', 'Role', id, undefined, null, {
      name: dto.name ?? role.name,
    });

    return { id, name: dto.name ?? role.name };
  }

  async remove(id: number, actorId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { userRoleAssignments: true },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Role Super Admin tidak dapat dihapus');
    }
    if (role.userRoleAssignments.length > 0) {
      throw new ConflictException('Role masih digunakan oleh pengguna dan tidak dapat dihapus');
    }

    await this.prisma.role.delete({ where: { id } });
    await this.auditService.log(actorId, 'ROLE_DELETED', 'Role', id, undefined, null, {
      name: role.name,
    });

    return { id };
  }

  async permissionCatalog() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
      include: { rolePermissionAssignments: true },
    });

    const grouped = Object.entries(PERMISSION_GROUPS).map(([key, slugs]) => ({
      key,
      permissions: permissions
        .filter((p) => slugs.includes(p.name))
        .map((p) => ({ id: p.id, name: p.name })),
    }));

    return {
      grouped,
      all: permissions.map((p) => ({ id: p.id, name: p.name })),
    };
  }
}
