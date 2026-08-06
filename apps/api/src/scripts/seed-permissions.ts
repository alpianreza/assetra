import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

const PERMISSION_CATALOG = [
  { name: 'users.view', group: 'Pengguna' },
  { name: 'users.create', group: 'Pengguna' },
  { name: 'users.update', group: 'Pengguna' },
  { name: 'users.delete', group: 'Pengguna' },
  { name: 'roles.view', group: 'Role & Permission' },
  { name: 'roles.manage', group: 'Role & Permission' },
  { name: 'master.area.view', group: 'Master Data' },
  { name: 'master.area.manage', group: 'Master Data' },
  { name: 'master.category.view', group: 'Master Data' },
  { name: 'master.category.manage', group: 'Master Data' },
  { name: 'master.item_type.view', group: 'Master Data' },
  { name: 'master.item_type.manage', group: 'Master Data' },
  { name: 'inventory.view', group: 'Inventory' },
  { name: 'inventory.create', group: 'Inventory' },
  { name: 'inventory.update', group: 'Inventory' },
  { name: 'inventory.delete', group: 'Inventory' },
  { name: 'checklist_template.view', group: 'Checklist' },
  { name: 'checklist_template.create', group: 'Checklist' },
  { name: 'checklist_template.update', group: 'Checklist' },
  { name: 'checklist_template.delete', group: 'Checklist' },
  { name: 'checklist_session.view', group: 'Checklist' },
  { name: 'checklist_session.manage', group: 'Checklist' },
  { name: 'compliance.view', group: 'Compliance' },
  { name: 'compliance.execute', group: 'Compliance' },
  { name: 'compliance.manage', group: 'Compliance' },
  { name: 'notification.view', group: 'Notification' },
  { name: 'notification.manage', group: 'Notification' },
  { name: 'notification.send', group: 'Notification' },
  { name: 'qr.view', group: 'QR Center' },
  { name: 'qr.print', group: 'QR Center' },
  { name: 'settings.organization.view', group: 'Settings' },
  { name: 'settings.organization.manage', group: 'Settings' },
  { name: 'reports.view', group: 'Reports' },
  { name: 'reports.export', group: 'Reports' },
  { name: 'dashboard.view', group: 'Dashboard' },
  { name: 'settings.working_day.manage', group: 'Settings' },
  { name: 'settings.holiday.manage', group: 'Settings' },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== Assetra Permissions & Roles Seed ===');

  // Create permissions
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: { name: perm.name },
    });
  }
  console.log(`✅ Seeded ${PERMISSION_CATALOG.length} permissions`);

  // Ensure Super Admin role exists
  let adminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({ data: { name: 'Super Admin' } });
    console.log('✅ Created Super Admin role');
  }

  // Assign all permissions to Super Admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermissionAssignment.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log(`✅ Assigned ${allPermissions.length} permissions to Super Admin`);

  console.log('\n=== Seed completed successfully ===');
  await app.close();
}

bootstrap().catch(async (e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});