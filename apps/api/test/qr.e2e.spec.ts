import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/auth/password.service';
import cookieParser from 'cookie-parser';

describe('QR Center (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;
  let sessionCookie: string;
  let csrfCookie: string;
  let csrfToken: string;

  let inventoryId: number;
  let publicId: string;
  let categoryId: number;
  let areaId: number;
  let itemTypeId: number;

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
    server = app.getHttpServer();

    // Permissions & admin user
    const permView = await prisma.permission.upsert({ where: { name: 'qr.view' }, update: {}, create: { name: 'qr.view' } });
    const permPrint = await prisma.permission.upsert({ where: { name: 'qr.print' }, update: {}, create: { name: 'qr.print' } });
    const role = await prisma.role.upsert({ where: { name: 'Qr Tester' }, update: {}, create: { name: 'Qr Tester' } });
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permView.id } }, update: {}, create: { roleId: role.id, permissionId: permView.id } });
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permPrint.id } }, update: {}, create: { roleId: role.id, permissionId: permPrint.id } });

    const passwordService = moduleFixture.get<PasswordService>(PasswordService);
    const user = await prisma.user.upsert({
      where: { username: 'qr_tester' },
      update: {},
      create: {
        name: 'QR Tester',
        username: 'qr_tester',
        passwordHash: await passwordService.hash('Password123!'),
        status: 'active',
        userRoleAssignments: { create: { roleId: role.id } },
      },
    });

    // Login
    const csrfRes = await request(server).get('/api/v1/auth/csrf');
    csrfToken = csrfRes.body.data.csrfToken;
    csrfCookie = csrfRes.header['set-cookie'][0].split(';')[0].split('=')[1];
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'qr_tester', password: 'Password123!' });
    const setCookieArr = loginRes.header['set-cookie'] as string | string[];
    const cookies = Array.isArray(setCookieArr) ? setCookieArr : [setCookieArr];
    sessionCookie = cookies.find((c: string) => c.startsWith('assetra_session'))!.split(';')[0].split('=')[1];
    const newCsrfCookie = cookies.find((c: string) => c.startsWith('assetra_csrf'));
    if (newCsrfCookie) csrfCookie = newCsrfCookie.split(';')[0].split('=')[1];

    // Master data
    const category = await prisma.inventoryCategory.create({ data: { name: `QC-${Date.now()}`, code: `QCC-${Date.now()}` } });
    categoryId = category.id;
    const area = await prisma.area.create({ data: { name: `QA-${Date.now()}` } });
    areaId = area.id;
    const itemType = await prisma.assetItemType.create({
      data: { name: `QIT-${Date.now()}`, code: `QIT-${Date.now()}-C`, categoryId, checklistFrequency: 'daily', allowNA: false },
    });
    itemTypeId = itemType.id;

    const inventory = await prisma.complianceInventory.create({
      data: { assetCode: `QR-${Date.now()}`, categoryId, areaId, itemTypeId },
    });
    inventoryId = inventory.id;
    publicId = inventory.publicId;

    const freshCsrf = await request(server).get('/api/v1/auth/csrf');
    csrfToken = freshCsrf.body.data.csrfToken;
    csrfCookie = freshCsrf.header['set-cookie'][0].split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await prisma.inventoryPicAssignment.deleteMany({});
    await prisma.complianceInventory.deleteMany({});
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

  it('1. QR data available for valid inventory', async () => {
    const res = await request(server)
      .get(`/api/v1/qr/inventory/${inventoryId}`)
      .set('Cookie', `assetra_session=${sessionCookie}`);
    expect(res.status).toBe(200);
    expect(res.body.data.publicId).toBe(publicId);
    expect(res.body.data.publicUrl).toContain('/q/');
  });

  it('2. Invalid inventory returns 404', async () => {
    const res = await request(server)
      .get('/api/v1/qr/inventory/999999')
      .set('Cookie', `assetra_session=${sessionCookie}`);
    expect(res.status).toBe(404);
  });

  it('3. Public identifier resolves to correct inventory (no sensitive fields)', async () => {
    const res = await request(server).get(`/api/v1/public/inventory/${publicId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.assetCode).toBeDefined();
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.sessions).toBeUndefined();
  });

  it('4. Public endpoint returns 404 for invalid identifier', async () => {
    const res = await request(server).get('/api/v1/public/inventory/invalid-id');
    expect(res.status).toBe(404);
  });

  it('5. Unauthorized user cannot access QR Center API', async () => {
    const res = await request(server).get(`/api/v1/qr/inventory/${inventoryId}`);
    expect(res.status).toBe(401);
  });

  it('6. Batch request accepts multiple inventory IDs', async () => {
    const inventory2 = await prisma.complianceInventory.create({
      data: { assetCode: `QR2-${Date.now()}`, categoryId, areaId, itemTypeId },
    });
    const res = await request(server)
      .post('/api/v1/qr/batch')
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ inventoryIds: [inventoryId, inventory2.id] });
    expect(res.status).toBe(201);
    expect(res.body.data.length).toBe(2);
    await prisma.complianceInventory.delete({ where: { id: inventory2.id } });
  });
});