import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/auth/password.service';
import cookieParser from 'cookie-parser';

/** Canonical permission catalog (mirrors seed-permissions.ts). */
const PERMISSIONS = [
  'users.view', 'users.create', 'users.update', 'users.delete',
  'roles.view', 'roles.manage',
  'master.area.view', 'master.area.manage',
  'master.category.view', 'master.category.manage',
  'master.item_type.view', 'master.item_type.manage',
  'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
  'checklist_template.view', 'checklist_template.create', 'checklist_template.update', 'checklist_template.delete',
  'checklist_session.view', 'checklist_session.manage',
  'compliance.view', 'compliance.execute', 'compliance.manage',
  'notification.view', 'notification.manage', 'notification.send',
  'qr.view', 'qr.print',
  'settings.organization.view', 'settings.organization.manage',
  'reports.view', 'reports.export',
  'dashboard.view',
  'settings.working_day.manage', 'settings.holiday.manage',
];

/**
 * CRUD Smoke Check — RBAC Administrator (Super Admin).
 * Exercises Create → Read → Update → Delete for:
 *   Area → Category → Item Type → User → Role → Inventory
 */
describe('CRUD Smoke Check with Administrator RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;
  let sessionCookie: string;
  let csrfToken: string;
  let csrfCookie: string;
  let adminRoleId: number;

  const testPassword = 'SuperAdmin123!';
  const unique = Date.now();

  const getCookies = (res: request.Response): Record<string, string> => {
    const cookies: Record<string, string> = {};
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
      arr.forEach((c: string) => {
        const [nv] = c.split(';');
        const [name, val] = nv.split('=');
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

    // Seed the permission catalog (mirrors seed-permissions.ts idempotently)
    const permissionIds: number[] = [];
    for (const name of PERMISSIONS) {
      const perm = await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
      permissionIds.push(perm.id);
    }

    // Create Super Admin role with ALL permissions
    const adminRole = await prisma.role.upsert({
      where: { name: 'Super Admin' },
      update: {},
      create: { name: 'Super Admin' },
    });
    adminRoleId = adminRole.id;
    for (const permissionId of permissionIds) {
      await prisma.rolePermissionAssignment.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId } },
        update: {},
        create: { roleId: adminRole.id, permissionId },
      });
    }

    // Admin user
    const username = `admin_${unique}`;
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        name: 'Admin Smoke',
        username,
        passwordHash: await passwordService.hash(testPassword),
        userRoleAssignments: { create: { roleId: adminRole.id } },
      },
    });

    // Login
    const csrfRes = await request(server).get('/api/v1/auth/csrf');
    csrfToken = csrfRes.body.data.csrfToken;
    csrfCookie = getCookies(csrfRes).assetra_csrf;
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: username, password: testPassword });
    sessionCookie = getCookies(loginRes).assetra_session;
    const newCsrfCookie = getCookies(loginRes).assetra_csrf;
    if (newCsrfCookie) csrfCookie = newCsrfCookie;
    const newCsrfRes = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`);
    csrfToken = newCsrfRes.body.data.csrfToken;
    const freshCsrfCookie = getCookies(newCsrfRes).assetra_csrf;
    if (freshCsrfCookie) csrfCookie = freshCsrfCookie;
  });

  afterAll(async () => {
    await prisma.evidence.deleteMany({});
    await prisma.checklistLog.deleteMany({});
    await prisma.inventoryChecklistAssignment.deleteMany({});
    await prisma.inventoryPicAssignment.deleteMany({});
    await prisma.complianceInventory.deleteMany({});
    await prisma.checklistTemplate.deleteMany({});
    await prisma.assetItemType.deleteMany({});
    await prisma.area.deleteMany({});
    await prisma.inventoryCategory.deleteMany({});
    await prisma.userRoleAssignment.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.rolePermissionAssignment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.permission.deleteMany({});
    await app.close();
  });

  const auth = () => ({
    'Cookie': `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`,
    'X-CSRF-Token': csrfToken,
  });

  it('should expose full permissions to /auth/me for Super Admin', async () => {
    const res = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', `assetra_session=${sessionCookie}`);
    expect(res.status).toBe(200);
    expect(res.body.permissions).toContain('dashboard.view');
    expect(res.body.permissions).toContain('users.create');
    expect(res.body.permissions).toContain('master.area.manage');
    expect(res.body.permissions).toContain('roles.manage');
    expect(res.body.permissions).toContain('inventory.create');
    expect(res.body.roles).toContain('Super Admin');
  });

  it('Area CRUD: create → read → update → delete', async () => {
    const name = `Area-${unique}`;
    const created = await request(server).post('/api/v1/master/areas').set(auth()).send({ name, locationDetail: 'Lokasi A' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const listed = await request(server).get('/api/v1/master/areas').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((a: any) => a.id === id)).toBe(true);

    const updated = await request(server).patch(`/api/v1/master/areas/${id}`).set(auth()).send({ name: `${name}-Updated` });
    expect(updated.status).toBe(200);

    const deleted = await request(server).delete(`/api/v1/master/areas/${id}`).set(auth());
    expect(deleted.status).toBe(200);
  });

  it('Category CRUD: create → read → update → delete', async () => {
    const name = `Cat-${unique}`;
    const created = await request(server).post('/api/v1/master/categories').set(auth()).send({ name, code: `C${unique}` });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const listed = await request(server).get('/api/v1/master/categories').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((c: any) => c.id === id)).toBe(true);

    const updated = await request(server).patch(`/api/v1/master/categories/${id}`).set(auth()).send({ name: `${name}-Updated` });
    expect(updated.status).toBe(200);

    const deleted = await request(server).delete(`/api/v1/master/categories/${id}`).set(auth());
    expect(deleted.status).toBe(200);
  });

  it('Item Type CRUD: create → read → update → delete (needs category)', async () => {
    // Need a category first
    const cat = await request(server).post('/api/v1/master/categories').set(auth()).send({ name: `ITCat-${unique}`, code: `ITC${unique}` });
    const categoryId = cat.body.data.id;

    const created = await request(server)
      .post('/api/v1/master/asset-item-types')
      .set(auth())
      .send({ name: `Item-${unique}`, code: `IT-${unique}`, categoryId, checklistFrequency: 'daily', allowNA: false });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const listed = await request(server).get('/api/v1/master/asset-item-types').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((t: any) => t.id === id)).toBe(true);

    const updated = await request(server).patch(`/api/v1/master/asset-item-types/${id}`).set(auth()).send({ name: `Item-${unique}-Updated` });
    expect(updated.status).toBe(200);

    const deleted = await request(server).delete(`/api/v1/master/asset-item-types/${id}`).set(auth());
    expect(deleted.status).toBe(200);

    await request(server).delete(`/api/v1/master/categories/${categoryId}`).set(auth());
  });

  it('Role CRUD: create → read → update → delete', async () => {
    const name = `Role-${unique}`;
    const created = await request(server).post('/api/v1/roles').set(auth()).send({ name });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const listed = await request(server).get('/api/v1/roles').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((r: any) => r.id === id)).toBe(true);

    const updated = await request(server).patch(`/api/v1/roles/${id}`).set(auth()).send({ name: `${name}-Updated` });
    expect(updated.status).toBe(200);

    const deleted = await request(server).delete(`/api/v1/roles/${id}`).set(auth());
    expect(deleted.status).toBe(200);
  });

  it('User CRUD: create → read → update → delete', async () => {
    const username = `user_${unique}`;
    const created = await request(server)
      .post('/api/v1/users')
      .set(auth())
      .send({ name: 'Smoke User', username, password: 'SmokePass123!', status: 'active', roleIds: [adminRoleId] });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const listed = await request(server).get('/api/v1/users').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items.some((u: any) => u.id === id)).toBe(true);

    const updated = await request(server).patch(`/api/v1/users/${id}`).set(auth()).send({ name: 'Smoke User Updated' });
    expect(updated.status).toBe(200);

    const deleted = await request(server).delete(`/api/v1/users/${id}`).set(auth());
    expect(deleted.status).toBe(200);
  });

  it('Inventory CRUD: create → read → update → delete (needs category + item type + area)', async () => {
    const cat = await request(server).post('/api/v1/master/categories').set(auth()).send({ name: `InvCat-${unique}`, code: `INVC${unique}` });
    const categoryId = cat.body.data.id;
    const area = await request(server).post('/api/v1/master/areas').set(auth()).send({ name: `InvArea-${unique}` });
    const areaId = area.body.data.id;
    const itemType = await request(server)
      .post('/api/v1/master/asset-item-types')
      .set(auth())
      .send({ name: `InvItem-${unique}`, code: `INVIT-${unique}`, categoryId, checklistFrequency: 'daily', allowNA: false });
    const itemTypeId = itemType.body.data.id;

    const assetCode = `INV-${unique}`;
    const created = await request(server)
      .post('/api/v1/inventory')
      .set(auth())
      .send({ assetCode, itemTypeId, areaId, status: 'active' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const listed = await request(server).get('/api/v1/inventory').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items.some((i: any) => i.id === id)).toBe(true);

    const updated = await request(server).patch(`/api/v1/inventory/${id}`).set(auth()).send({ typeDescription: 'Updated desc' });
    expect(updated.status).toBe(200);

    const deleted = await request(server).delete(`/api/v1/inventory/${id}`).set(auth());
    expect(deleted.status).toBe(200);

    await request(server).delete(`/api/v1/master/asset-item-types/${itemTypeId}`).set(auth());
    await request(server).delete(`/api/v1/master/areas/${areaId}`).set(auth());
    await request(server).delete(`/api/v1/master/categories/${categoryId}`).set(auth());
  });
});
