jest.setTimeout(30000);

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/auth/password.service';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';

describe('Evidence Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;
  let sessionCookie: string;
  let csrfToken: string;
  let csrfCookie: string;

  let categoryId: number;
  let itemTypeId: number;
  let inventoryId: number;
  let otherInventoryId: number;
  let templateId: number;
  let userId: number;
  let checklistLogId: number;

  const testPassword = 'TestPassword123!';
  const storageDir = path.join(process.cwd(), 'storage', 'evidence');

  const getCookies = (res: request.Response): Record<string, string> => {
    const cookies: Record<string, string> = {};
    const setCookie = res.headers["set-cookie"];
    if (setCookie) {
      const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
      arr.forEach((c: string) => {
        const [nv] = c.split(";");
        const [name, val] = nv.split("=");
        cookies[name] = val;
      });
    }
    return cookies;
  };

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

    // Permissions & user
    const permExecute = await prisma.permission.upsert({ where: { name: 'compliance.execute' }, update: {}, create: { name: 'compliance.execute' } });
    const permView = await prisma.permission.upsert({ where: { name: 'compliance.view' }, update: {}, create: { name: 'compliance.view' } });
    const role = await prisma.role.upsert({ where: { name: 'Evidence Tester' }, update: {}, create: { name: 'Evidence Tester' } });
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permExecute.id } }, update: {}, create: { roleId: role.id, permissionId: permExecute.id } });
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permView.id } }, update: {}, create: { roleId: role.id, permissionId: permView.id } });

    const user = await prisma.user.upsert({
      where: { username: 'evidence_tester' },
      update: {},
      create: {
        name: 'Evidence Tester',
        username: 'evidence_tester',
        passwordHash: await passwordService.hash(testPassword),
        userRoleAssignments: { create: { roleId: role.id } },
      },
    });
    userId = user.id;

    // Login
    const csrfRes = await request(server).get('/api/v1/auth/csrf');
    csrfToken = csrfRes.body.data.csrfToken;
    csrfCookie = getCookies(csrfRes).assetra_csrf;
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'evidence_tester', password: testPassword });
    sessionCookie = getCookies(loginRes).assetra_session;
    const newCsrfCookie = getCookies(loginRes).assetra_csrf;
    if (newCsrfCookie) csrfCookie = newCsrfCookie;
    const newCsrfRes = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`);
    // Sync BOTH token and cookie from the fresh CSRF response.
    csrfToken = newCsrfRes.body.data.csrfToken;
    const freshCsrfCookie = getCookies(newCsrfRes).assetra_csrf;
    if (freshCsrfCookie) csrfCookie = freshCsrfCookie;

    // Setup master data
    const category = await prisma.inventoryCategory.create({ data: { name: `EC-${Date.now()}`, code: `ECC-${Date.now()}` } });
    categoryId = category.id;
    const itemType = await prisma.assetItemType.create({
      data: { name: `EItem-${Date.now()}`, code: `EIT-${Date.now()}`, categoryId, checklistFrequency: 'daily', allowNA: false },
    });
    itemTypeId = itemType.id;
    const inventory = await prisma.complianceInventory.create({
      data: { assetCode: `EV-${Date.now()}`, categoryId, itemTypeId },
    });
    inventoryId = inventory.id;
    const otherInventory = await prisma.complianceInventory.create({
      data: { assetCode: `EV2-${Date.now()}`, categoryId, itemTypeId },
    });
    otherInventoryId = otherInventory.id;

    const template = await prisma.checklistTemplate.create({
      data: {
        name: `ET-${Date.now()}`,
        itemTypeId,
        questions: { create: [{ questionText: 'Kondisi baik?', sortOrder: 0 }] },
      },
    });
    templateId = template.id;

    const checklistLog = await prisma.checklistLog.create({
      data: {
        inventoryId,
        templateId,
        checkDate: new Date(),
        periodKey: '2026-08-05',
        status: 'ok',
        checkedById: userId,
        questionId: null,
      },
    });
    checklistLogId = checklistLog.id;

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean evidence files then records (FK order: evidence first)
    const evidenceRows = await prisma.evidence.findMany({ select: { storageKey: true } });
    for (const row of evidenceRows) {
      const p = path.join(storageDir, row.storageKey);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await prisma.evidence.deleteMany({});
    await prisma.checklistLog.deleteMany({});
    await prisma.complianceInventory.deleteMany({});
    await prisma.checklistTemplate.deleteMany({});
    await prisma.assetItemType.deleteMany({});
    await prisma.inventoryCategory.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.userRoleAssignment.deleteMany({});
    await prisma.rolePermissionAssignment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.permission.deleteMany({});
    await app.close();
  });

  const authHeaders = () => ({
    'Cookie': `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`,
    'X-CSRF-Token': csrfToken,
  });

  it('should reject unauthorized upload (no session)', async () => {
    const res = await request(server)
      .post('/api/v1/evidence/upload')
      .query({ checklistLogId, inventoryId })
      .attach('file', Buffer.from('fake'), { filename: 'x.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBeGreaterThanOrEqual(401);
  });

  it('should upload a valid image evidence', async () => {
    const fileContent = Buffer.from('fake-jpeg-content');
    const res = await request(server)
      .post('/api/v1/evidence/upload')
      .set(authHeaders())
      .query({ checklistLogId, inventoryId })
      .attach('file', fileContent, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.checklistLogId).toBe(checklistLogId);
    expect(res.body.data.inventoryId).toBe(inventoryId);

    // File persisted on disk
    const storageKey = res.body.data.storageKey;
    const diskPath = path.join(storageDir, storageKey);
    expect(fs.existsSync(diskPath)).toBe(true);
  });

  it('should reject non-image file types', async () => {
    const res = await request(server)
      .post('/api/v1/evidence/upload')
      .set(authHeaders())
      .query({ checklistLogId, inventoryId })
      .attach('file', Buffer.from('plain text'), { filename: 'note.txt', contentType: 'text/plain' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should reject evidence for checklist of another inventory (relation integrity)', async () => {
    const res = await request(server)
      .post('/api/v1/evidence/upload')
      .set(authHeaders())
      .query({ checklistLogId, inventoryId: otherInventoryId })
      .attach('file', Buffer.from('fake'), { filename: 'x.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tidak sesuai dengan inventaris/i);
  });

  it('should reject evidence for non-existent checklist log', async () => {
    const res = await request(server)
      .post('/api/v1/evidence/upload')
      .set(authHeaders())
      .query({ checklistLogId: 999999, inventoryId })
      .attach('file', Buffer.from('fake'), { filename: 'x.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
  });

  it('should retrieve evidence and delete it (cleans DB + file)', async () => {
    // Upload
    const up = await request(server)
      .post('/api/v1/evidence/upload')
      .set(authHeaders())
      .query({ checklistLogId, inventoryId })
      .attach('file', Buffer.from('fake-jpeg-content'), { filename: 'del.jpg', contentType: 'image/jpeg' });
    expect(up.status).toBe(201);
    const evId = up.body.data.id;
    const storageKey = up.body.data.storageKey;
    const diskPath = path.join(storageDir, storageKey);
    expect(fs.existsSync(diskPath)).toBe(true);

    // Get
    const get = await request(server)
      .get(`/api/v1/evidence/${evId}`)
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`);
    expect(get.status).toBe(200);
    expect(get.body.data.id).toBe(evId);

    // Delete
    const del = await request(server)
      .delete(`/api/v1/evidence/${evId}`)
      .set(authHeaders());
    expect(del.status).toBe(200);

    // DB row removed
    const row = await prisma.evidence.findUnique({ where: { id: evId } });
    expect(row).toBeNull();
    // File removed
    expect(fs.existsSync(diskPath)).toBe(false);
  });
});
