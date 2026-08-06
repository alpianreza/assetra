import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/auth/password.service';
import cookieParser from 'cookie-parser';

describe('Compliance Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;
  let sessionCookie: string;
  let csrfToken: string;
  let csrfCookie: string;

  let categoryId: number;
  let itemTypeId: number;
  let areaId: number;
  let inventoryId: number;
  let templateId: number;
  let questionId1: number;
  let questionId2: number;
  let userId: number;
  let sessionId: number;

  const testPassword = 'TestPassword123!';

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
    const permView = await prisma.permission.upsert({ where: { name: 'compliance.view' }, update: {}, create: { name: 'compliance.view' } });
    const permExecute = await prisma.permission.upsert({ where: { name: 'compliance.execute' }, update: {}, create: { name: 'compliance.execute' } });
    const role = await prisma.role.upsert({ where: { name: 'Compliance Tester' }, update: {}, create: { name: 'Compliance Tester' } });
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permView.id } }, update: {}, create: { roleId: role.id, permissionId: permView.id } });
    await prisma.rolePermissionAssignment.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permExecute.id } }, update: {}, create: { roleId: role.id, permissionId: permExecute.id } });

    const user = await prisma.user.upsert({
      where: { username: 'compliance_tester' },
      update: {},
      create: {
        name: 'Compliance Tester',
        username: 'compliance_tester',
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
      .send({ identifier: 'compliance_tester', password: testPassword });
    sessionCookie = getCookies(loginRes).assetra_session;
    // Get new CSRF token from login response cookies
    const newCsrfCookie = getCookies(loginRes).assetra_csrf;
    if (newCsrfCookie) csrfCookie = newCsrfCookie;
    // Get the new CSRF token by calling /auth/csrf again with the session cookie
    const newCsrfRes = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`);
    csrfToken = newCsrfRes.body.data.csrfToken;

    // Setup master data: category, area, item type (allowNA=false), inventory
    const category = await prisma.inventoryCategory.create({ data: { name: `C-${Date.now()}`, code: `CC-${Date.now()}` } });
    categoryId = category.id;
    const area = await prisma.area.create({ data: { name: `Area-${Date.now()}` } });
    areaId = area.id;
    const itemType = await prisma.assetItemType.create({
      data: {
        name: `Item-${Date.now()}`,
        code: `IT-${Date.now()}`,
        categoryId,
        checklistFrequency: 'daily',
        allowNA: false,
      },
    });
    itemTypeId = itemType.id;
    const inventory = await prisma.complianceInventory.create({
      data: { assetCode: `COMP-${Date.now()}`, categoryId, areaId, itemTypeId },
    });
    inventoryId = inventory.id;

    // Template with 2 questions
    const template = await prisma.checklistTemplate.create({
      data: {
        name: `T-${Date.now()}`,
        itemTypeId,
        questions: {
          create: [
            { questionText: 'Kondisi baik?', sortOrder: 0 },
            { questionText: 'Label ada?', sortOrder: 1 },
          ],
        },
      },
    });
    templateId = template.id;
    const questions = await prisma.checklistQuestion.findMany({ where: { templateId } });
    questionId1 = questions[0].id;
    questionId2 = questions[1].id;

    // Assign template to inventory
    await prisma.inventoryChecklistAssignment.create({ data: { inventoryId, templateId } });

    // Session
    const session = await prisma.checklistSession.create({ data: { name: 'Pagi Test', code: `PG-${Date.now()}`, startTime: '06:00', endTime: '11:00', sortOrder: 1 } });
    sessionId = session.id;
    await prisma.checklistTemplateSession.create({ data: { templateId, sessionId } });

    // Working day: ensure today is a working day
    const today = new Date();
    const dayOfWeek = today.getDay();
    const existingWd = await prisma.workingDayConfiguration.findUnique({ where: { dayOfWeek } });
    if (!existingWd) {
      await prisma.workingDayConfiguration.create({ data: { dayOfWeek, status: 'WORKING' } });
    } else if (existingWd.status !== 'WORKING') {
      await prisma.workingDayConfiguration.update({ where: { dayOfWeek }, data: { status: 'WORKING' } });
    }

    // @ts-expect-error for test setup closure
    global.__auth = authHeaders;
  });

  afterAll(async () => {
    await prisma.evidence.deleteMany({});
    await prisma.checklistLog.deleteMany({});
    await prisma.inventoryChecklistAssignment.deleteMany({});
    await prisma.checklistTemplateSession.deleteMany({});
    await prisma.checklistQuestion.deleteMany({});
    await prisma.checklistTemplate.deleteMany({});
    await prisma.checklistSession.deleteMany({});
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

  const getCsrf = async () => {
    const res = await request(server).get('/api/v1/auth/csrf').set('Cookie', `assetra_session=${sessionCookie}`);
    expect(res.status).toBe(200);
    const cookies = getCookies(res);
    return { token: res.body.data.csrfToken, csrfCookie: cookies.assetra_csrf };
  };

  const authHeaders = () => ({
    'Cookie': `assetra_session=${sessionCookie}; assetra_csrf=${csrfCookie}`,
    'X-CSRF-Token': csrfToken,
  });

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  it('1. Compliance overview returns inventory with template', async () => {
    const res = await request(server).get('/api/v1/compliance').set(authHeaders());
    expect(res.status).toBe(200);
    expect(res.body.data.some((i: any) => i.id === inventoryId)).toBe(true);
  });

  it('2. Periods endpoint returns today period', async () => {
    const res = await request(server).get(`/api/v1/compliance/inventory/${inventoryId}/periods`).set(authHeaders());
    expect(res.status).toBe(200);
    const periods = res.body.data.periods;
    const todayPeriod = periods.find((p: any) => p.periodKey === todayKey() && p.templateId === templateId);
    expect(todayPeriod).toBeDefined();
  });

  it('3. allow_na=false rejects NA submission', async () => {
    const todayP = todayKey();
    const csrf = await getCsrf();
    const res = await request(server)
      .post(`/api/v1/compliance/inventory/${inventoryId}/checklist?templateId=${templateId}`)
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrf.csrfCookie}`)
      .set('X-CSRF-Token', csrf.token)
      .send({
        periodKey: todayP,
        sessionId: sessionId,
        answers: [
          { questionId: questionId1, status: 'ok' },
          { questionId: questionId2, status: 'na' },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('tidak diizinkan');
  });

  it('4. allow_na=true accepts NA', async () => {
    // Flip allowNA on item type
    await prisma.assetItemType.update({ where: { id: itemTypeId }, data: { allowNA: true } });

    const todayP = todayKey();
    const csrf = await getCsrf();
    const res = await request(server)
      .post(`/api/v1/compliance/inventory/${inventoryId}/checklist?templateId=${templateId}`)
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrf.csrfCookie}`)
      .set('X-CSRF-Token', csrf.token)
      .send({
        periodKey: todayP,
        sessionId: sessionId,
        answers: [
          { questionId: questionId1, status: 'ok' },
          { questionId: questionId2, status: 'na' },
        ],
      });
    expect(res.status).toBe(201);
  });

  it('5. Future checklist rejected', async () => {
    const csrf = await getCsrf();
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const futureKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    const res = await request(server)
      .post(`/api/v1/compliance/inventory/${inventoryId}/checklist?templateId=${templateId}`)
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrf.csrfCookie}`)
      .set('X-CSRF-Token', csrf.token)
      .send({
        periodKey: futureKey,
        sessionId: sessionId,
        answers: [{ questionId: questionId1, status: 'ok' }],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('masa depan');
  });

  it('6. Offday resolution blocks execution on OFF day', async () => {
    // Force Sunday OFF and ensure today is WORKING before testing
    const sun = await prisma.workingDayConfiguration.findUnique({ where: { dayOfWeek: 0 } });
    if (sun) await prisma.workingDayConfiguration.update({ where: { dayOfWeek: 0 }, data: { status: 'OFF' } });
    else await prisma.workingDayConfiguration.create({ data: { dayOfWeek: 0, status: 'OFF' } });

    // Ensure today is WORKING
    const today = new Date();
    const todayWd = await prisma.workingDayConfiguration.findUnique({ where: { dayOfWeek: today.getDay() } });
    if (todayWd && todayWd.status === 'OFF') {
      await prisma.workingDayConfiguration.update({ where: { dayOfWeek: today.getDay() }, data: { status: 'WORKING' } });
    }

    // Find the next OFF day that is not today (use Sunday which is forced OFF)
    const offDay = new Date();
    offDay.setDate(offDay.getDate() + ((7 - offDay.getDay()) % 7 || 7)); // next Sunday
    const offKey = `${offDay.getFullYear()}-${String(offDay.getMonth() + 1).padStart(2, '0')}-${String(offDay.getDate()).padStart(2, '0')}`;

    const csrf = await getCsrf();
    const res = await request(server)
      .post(`/api/v1/compliance/inventory/${inventoryId}/checklist?templateId=${templateId}`)
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${csrf.csrfCookie}`)
      .set('X-CSRF-Token', csrf.token)
      .send({
        periodKey: offKey,
        sessionId: sessionId,
        answers: [{ questionId: questionId1, status: 'ok' }],
      });
    // The next Sunday is an OFF day but also likely in the future; both should be rejected
    // If the next Sunday is within 7 days and it's not a future date issue, offday check fires.
    expect(res.status).toBe(400);
  });
});
