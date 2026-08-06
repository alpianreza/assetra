import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/auth/password.service';
import cookieParser from 'cookie-parser';
import * as crypto from 'crypto';

describe('Inventory Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;
  let managerSessionCookie: string;
  let managerCsrfToken: string;
  let managerCsrfCookie: string;

  let areaId: number;
  let itemTypeId: number;
  let picUser1Id: number;
  let picUser2Id: number;
  let inactivePicUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    const passwordService = moduleFixture.get<PasswordService>(PasswordService);
    server = app.getHttpServer();

    // Setup permissions and user
    const permCreate = await prisma.permission.upsert({ where: { name: 'inventory.create' }, update: {}, create: { name: 'inventory.create' }});
    const permView = await prisma.permission.upsert({ where: { name: 'inventory.view' }, update: {}, create: { name: 'inventory.view' }});
    const permUpdate = await prisma.permission.upsert({ where: { name: 'inventory.update' }, update: {}, create: { name: 'inventory.update' }});
    const permDelete = await prisma.permission.upsert({ where: { name: 'inventory.delete' }, update: {}, create: { name: 'inventory.delete' }});

    const role = await prisma.role.upsert({ where: { name: 'Inventory Manager' }, update: {}, create: { name: 'Inventory Manager' }});
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permCreate.id } }, update: {}, create: { roleId: role.id, permissionId: permCreate.id }});
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permView.id } }, update: {}, create: { roleId: role.id, permissionId: permView.id }});
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permUpdate.id } }, update: {}, create: { roleId: role.id, permissionId: permUpdate.id }});
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permDelete.id } }, update: {}, create: { roleId: role.id, permissionId: permDelete.id }});

    const user = await prisma.user.upsert({
      where: { username: 'inv_manager' },
      update: { passwordHash: await passwordService.hash('Password123!') },
      create: {
        name: 'Inv Manager',
        username: 'inv_manager',
        passwordHash: await passwordService.hash('Password123!'),
        userRoleAssignments: { create: { roleId: role.id } },
      },
    });

    // Login to get session
    const csrfRes = await request(server).get('/api/v1/auth/csrf');
    managerCsrfToken = csrfRes.body.data.csrfToken;
    managerCsrfCookie = csrfRes.header['set-cookie'][0].split(';')[0].split('=')[1];

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${managerCsrfCookie}`)
      .set('X-CSRF-Token', managerCsrfToken)
      .send({ identifier: 'inv_manager', password: 'Password123!' });
    const setCookie = loginRes.header['set-cookie'] as string | string[];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    managerSessionCookie = cookies.find((c: string) => c.startsWith('assetra_session'))!.split(';')[0].split('=')[1];

    // Setup master data
    const category = await prisma.inventoryCategory.create({ data: { name: 'E-Test Cat', code: `ETC-${Date.now()}` }});
    const area = await prisma.area.create({ data: { name: 'E-Test Area' }});
    const itemType = await prisma.assetItemType.create({ data: { name: 'E-Test Item', code: `ETI-${Date.now()}`, categoryId: category.id, checklistFrequency: 'monthly' }});
    areaId = area.id;
    itemTypeId = itemType.id;

    const u1 = await prisma.user.create({ data: { name: 'PIC 1', username: `pic1-${Date.now()}`, passwordHash: '...' }});
    const u2 = await prisma.user.create({ data: { name: 'PIC 2', username: `pic2-${Date.now()}`, passwordHash: '...' }});
    const u3 = await prisma.user.create({ data: { name: 'Inactive PIC', username: `pic3-${Date.now()}`, passwordHash: '...', status: 'inactive' }});
    picUser1Id = u1.id;
    picUser2Id = u2.id;
    inactivePicUserId = u3.id;
  });

  afterAll(async () => {
    // Clean up test records (idempotent, order respecting FK constraints)
    await prisma.evidence.deleteMany({});
    await prisma.checklistLog.deleteMany({});
    await prisma.inventoryChecklistAssignment.deleteMany({});
    await prisma.inventoryPicAssignment.deleteMany({});
    await prisma.complianceInventory.deleteMany({});
    await prisma.checklistTemplate.deleteMany({});
    await prisma.assetItemType.deleteMany({});
    await prisma.area.deleteMany({});
    await prisma.inventoryCategory.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.userRoleAssignment.deleteMany({});
    await prisma.rolePermissionAssignment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.permission.deleteMany({});
    await app.close();
  });

  const getAuthHeaders = () => ({
    'Cookie': `assetra_session=${managerSessionCookie}; assetra_csrf=${managerCsrfCookie}`,
    'X-CSRF-Token': managerCsrfToken,
  });

  it('1. Create inventory with multiple PICs atomically', async () => {
    const res = await request(server)
      .post('/api/v1/inventory')
      .set(getAuthHeaders())
      .send({
        assetCode: `TEST-001-${Date.now()}`,
        itemTypeId,
        areaId,
        picUserIds: [picUser1Id, picUser2Id],
      });

    expect(res.status).toBe(201);
    const createdInv = await prisma.complianceInventory.findUnique({
      where: { id: res.body.data.id },
      include: { picAssignments: true },
    });
    expect(createdInv?.picAssignments.length).toBe(2);
  });

  it('2. Reject creating inventory with duplicate asset code', async () => {
    const assetCode = `TEST-002-${Date.now()}`;
    await request(server).post('/api/v1/inventory').set(getAuthHeaders()).send({ assetCode, itemTypeId, areaId });

    const res = await request(server).post('/api/v1/inventory').set(getAuthHeaders()).send({ assetCode, itemTypeId, areaId });
    expect(res.status).toBe(409);
  });

  it('3. Reject assigning an inactive user as a new PIC', async () => {
    const res = await request(server)
      .post('/api/v1/inventory')
      .set(getAuthHeaders())
      .send({
        assetCode: `TEST-003-${Date.now()}`,
        itemTypeId,
        areaId,
        picUserIds: [picUser1Id, inactivePicUserId],
      });
    expect(res.status).toBe(400);
  });

  it('4. Update PIC assignments correctly (add/remove)', async () => {
    const invRes = await request(server)
      .post('/api/v1/inventory').set(getAuthHeaders())
      .send({ assetCode: `TEST-004-${Date.now()}`, itemTypeId, areaId, picUserIds: [picUser1Id] });

    const invId = invRes.body.data.id;
    const res = await request(server)
      .patch(`/api/v1/inventory/${invId}`)
      .set(getAuthHeaders())
      .send({ picUserIds: [picUser2Id] }); // Remove 1, add 2

    expect(res.status).toBe(200);
    const updatedInv = await prisma.complianceInventory.findUnique({
        where: { id: invId },
        include: { picAssignments: true },
    });
    expect(updatedInv?.picAssignments.length).toBe(1);
    expect(updatedInv?.picAssignments[0].userId).toBe(picUser2Id);
  });

  it('5. Prevent deleting inventory with compliance history', async () => {
    const invRes = await request(server).post('/api/v1/inventory').set(getAuthHeaders())
      .send({ assetCode: `TEST-005-${Date.now()}`, itemTypeId, areaId, picUserIds: [picUser1Id] });
    const invId = invRes.body.data.id;

    // Simulate history
    const template = await prisma.checklistTemplate.create({ data: { name: `test template ${Date.now()}`, itemTypeId }});
    await prisma.checklistLog.create({
        data: { inventoryId: invId, templateId: template.id, checkDate: new Date(), periodKey: 'D-1', status: 'ok', checkedById: picUser1Id }
    });

    const res = await request(server).delete(`/api/v1/inventory/${invId}`).set(getAuthHeaders());
    expect(res.status).toBe(409);
  });

  it('6. Reject unauthorized access to inventory endpoints', async () => {
    const res = await request(server).get('/api/v1/inventory'); // No auth
    expect(res.status).toBe(401);
  });
});
