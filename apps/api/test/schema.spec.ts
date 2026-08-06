import { PrismaClient } from '@prisma/client';

describe('Database Schema Constraints Validation', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test records in correct order (FK dependencies)
    await prisma.evidence.deleteMany({});
    await prisma.checklistLog.deleteMany({});
    await prisma.inventoryChecklistAssignment.deleteMany({});
    await prisma.inventoryPicAssignment.deleteMany({});
    await prisma.complianceInventory.deleteMany({});
    await prisma.assetItemType.deleteMany({});
    await prisma.inventoryCategory.deleteMany({});
    await prisma.checklistQuestion.deleteMany({});
    await prisma.checklistTemplate.deleteMany({});
    await prisma.checklistSession.deleteMany({});
    await prisma.checklistTemplateSession.deleteMany({});
    await prisma.userRoleAssignment.deleteMany({});
    await prisma.rolePermissionAssignment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.$disconnect();
  });

  it('should enforce unique constraint on Relational PIC (inventoryId + userId)', async () => {
    const timestamp = Date.now();
    const category = await prisma.inventoryCategory.create({
      data: { name: `Test Category ${timestamp}`, code: `TEST_CAT_${timestamp}` },
    });

    const inventory = await prisma.complianceInventory.create({
      data: {
        categoryId: category.id,
        assetCode: `TEST-ASSET-${timestamp}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        name: `PIC Tester ${timestamp}`,
        username: `pic_tester_${timestamp}`,
        passwordHash: 'hash',
      },
    });

    // First assignment - should succeed
    const firstAssignment = await prisma.inventoryPicAssignment.create({
      data: {
        inventoryId: inventory.id,
        userId: user.id,
      },
    });
    expect(firstAssignment.id).toBeDefined();

    // Duplicate assignment - should fail with unique constraint violation
    await expect(
      prisma.inventoryPicAssignment.create({
        data: {
          inventoryId: inventory.id,
          userId: user.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on UserRoleAssignment (userId + roleId)', async () => {
    const timestamp = Date.now();
    const user = await prisma.user.create({
      data: {
        name: `Role Tester ${timestamp}`,
        username: `role_tester_${timestamp}`,
        passwordHash: 'hash',
      },
    });

    const role = await prisma.role.create({
      data: { name: `TestRole_${timestamp}` },
    });

    await prisma.userRoleAssignment.create({
      data: { userId: user.id, roleId: role.id },
    });

    await expect(
      prisma.userRoleAssignment.create({
        data: { userId: user.id, roleId: role.id },
      }),
    ).rejects.toThrow();
  });

  it('should enforce unique constraint on RolePermissionAssignment (roleId + permissionId)', async () => {
    const role = await prisma.role.create({
      data: { name: `PermRole_${Date.now()}` },
    });

    const perm = await prisma.permission.upsert({ where: { name: 'inventory.view' }, update: {}, create: { name: 'inventory.view' } });

    await prisma.rolePermissionAssignment.create({
      data: { roleId: role.id, permissionId: perm.id },
    });

    await expect(
      prisma.rolePermissionAssignment.create({
        data: { roleId: role.id, permissionId: perm.id },
      }),
    ).rejects.toThrow();
  });
});
