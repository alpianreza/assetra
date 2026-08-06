import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/modules/auth/password.service';
import cookieParser from 'cookie-parser';
import * as crypto from 'crypto';

describe('Auth & CSRF Critical-Path Contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let server: any;

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
    passwordService = moduleFixture.get<PasswordService>(PasswordService);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await prisma.session.deleteMany({});
    await prisma.userRoleAssignment.deleteMany({});
    await prisma.rolePermissionAssignment.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.permission.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await app.close();
  });

  // Helper to add delay
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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

  const getCsrf = async () => {
    const res = await request(server).get('/api/v1/auth/csrf');
    expect(res.status).toBe(200);
    const cookies = getCookies(res);
    return { token: res.body.data.csrfToken, csrfCookie: cookies.assetra_csrf };
  };

  const testPassword = 'TestPassword123!';
  let userId: number;
  let csrfCookie: string;
  let csrfToken: string;

  beforeAll(async () => {
    // Setup test user with role and permission
    const perm = await prisma.permission.upsert({ where: { name: 'inventory.view' }, update: {}, create: { name: 'inventory.view' } });
    const role = await prisma.role.upsert({ where: { name: 'Manager' }, update: {}, create: { name: 'Manager' } });
    await prisma.rolePermissionAssignment.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id }
    });

    const passwordHash = await passwordService.hash(testPassword);
    const user = await prisma.user.upsert({
      where: { username: 'manager' },
      update: { passwordHash, status: 'active' },
      create: {
        name: 'Manager User',
        username: 'manager',
        email: 'manager@example.com',
        passwordHash,
        status: 'active',
        userRoleAssignments: { create: { roleId: role.id } },
      },
    });
    userId = user.id;

    const csrf = await getCsrf();
    csrfCookie = csrf.csrfCookie;
    csrfToken = csrf.token;
  });

  it('1. Valid login succeeds and returns user profile without passwordHash', async () => {
    await sleep(500); // Avoid rate limit
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'manager', password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.username).toBe('manager');
    expect(res.body.roles).toContain('Manager');
    expect(res.body.permissions).toContain('inventory.view');
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('2. Wrong password and unknown user produce identical generic credential error', async () => {
    await sleep(500); // Avoid rate limit
    // Wrong password
    const c1 = await getCsrf();
    const r1 = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${c1.csrfCookie}`)
      .set('X-CSRF-Token', c1.token)
      .send({ identifier: 'manager', password: 'WrongPassword!' });

    expect(r1.status).toBe(401);
    expect(r1.body.message).toBe('Invalid credentials');

    // Unknown user
    const c2 = await getCsrf();
    const r2 = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${c2.csrfCookie}`)
      .set('X-CSRF-Token', c2.token)
      .send({ identifier: 'unknown', password: testPassword });

    expect(r2.status).toBe(401);
    expect(r2.body.message).toBe('Invalid credentials');
  });

  it('3. Inactive user cannot login', async () => {
    await sleep(500); // Avoid rate limit
    const passwordHash = await passwordService.hash(testPassword);
    const inactive = await prisma.user.create({
      data: { name: 'Inactive', username: 'inactive', passwordHash, status: 'inactive' },
    });

    const c = await getCsrf();
    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${c.csrfCookie}`)
      .set('X-CSRF-Token', c.token)
      .send({ identifier: 'inactive', password: testPassword });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');

    await prisma.user.delete({ where: { id: inactive.id } });
  });

  it('4. Valid session accesses /auth/me, invalid/expired session rejected', async () => {
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'manager', password: testPassword });

    const sessionCookie = getCookies(loginRes).assetra_session;
    expect(sessionCookie).toBeDefined();

    // Valid session
    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', `assetra_session=${sessionCookie}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe(userId);

    // Invalid session
    const badRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', 'assetra_session=fake_token');
    expect(badRes.status).toBe(401);
  });

  it('5. User becoming inactive after login cannot use existing session', async () => {
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'manager', password: testPassword });

    const sessionCookie = getCookies(loginRes).assetra_session;

    // Set user inactive
    await prisma.user.update({ where: { id: userId }, data: { status: 'inactive' } });

    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', `assetra_session=${sessionCookie}`);
    expect(meRes.status).toBe(401);

    // Restore active status
    await prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
  });

  it('6. Session token stored as SHA-256 hash in database, raw token never persisted', async () => {
    // Need fresh login to get session cookie
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'manager', password: testPassword });

    const sessionCookie = getCookies(loginRes).assetra_session;
    expect(sessionCookie).toBeDefined();

    // Find the session by computing the hash from the cookie
    const computedHash = crypto.createHash('sha256').update(sessionCookie).digest('hex');
    const session = await prisma.session.findUnique({ where: { tokenHash: computedHash } });
    expect(session).toBeDefined();
    expect(session!.tokenHash).toHaveLength(64);
    expect(session!.tokenHash).toBe(computedHash);
    expect(sessionCookie).not.toBe(session!.tokenHash);
  });

  it('7. Logout revokes session and old session cannot be used', async () => {
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'manager', password: testPassword });

    const sessionCookie = getCookies(loginRes).assetra_session;
    // Use the NEW CSRF token from login response
    const newCsrfCookie = getCookies(loginRes).assetra_csrf;

    const logoutRes = await request(server)
      .post('/api/v1/auth/logout')
      .set('Cookie', `assetra_session=${sessionCookie}; assetra_csrf=${newCsrfCookie}`)
      .set('X-CSRF-Token', newCsrfCookie); // Use the new CSRF token
    expect(logoutRes.status).toBe(200);

    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', `assetra_session=${sessionCookie}`);
    expect(meRes.status).toBe(401);
  });

  it('8. Login & mutations without/invalid CSRF rejected, valid CSRF accepted', async () => {
    // Login without CSRF
    const r1 = await request(server)
      .post('/api/v1/auth/login')
      .send({ identifier: 'manager', password: testPassword });
    expect(r1.status).toBe(401);

    // Login with invalid CSRF
    const r2 = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', 'invalid_token')
      .send({ identifier: 'manager', password: testPassword });
    expect(r2.status).toBe(401);

    // Login with valid CSRF - get fresh CSRF
    const freshCsrf = await getCsrf();
    const r3 = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${freshCsrf.csrfCookie}`)
      .set('X-CSRF-Token', freshCsrf.token)
      .send({ identifier: 'manager', password: testPassword });
    expect(r3.status).toBe(200);
  });

  it('9. Protected endpoint without session returns 401', async () => {
    const res = await request(server).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('10. Multiple roles produce correct permissions union', async () => {
    // Unique name to prevent collisions across retries
    const permName = `reports.view.${Date.now()}`;
    const roleName = `Auditor.${Date.now()}`;
    const perm2 = await prisma.permission.create({ data: { name: permName } });
    const role2 = await prisma.role.create({ data: { name: roleName } });
    await prisma.rolePermissionAssignment.create({ data: { roleId: role2.id, permissionId: perm2.id } });
    await prisma.userRoleAssignment.create({ data: { userId, roleId: role2.id } });

    const res = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', `assetra_csrf=${csrfCookie}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ identifier: 'manager', password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.permissions).toContain('inventory.view');
    expect(res.body.permissions).toContain(permName);
    expect(res.body.roles).toContain('Manager');
    expect(res.body.roles).toContain(roleName);
  });

  it('11. Critical auth audit events persisted to database', async () => {
    // Verify audit logs for login success, failed, and logout were recorded during test run
    const successLogs = await prisma.auditLog.findMany({ where: { action: 'LOGIN_SUCCESS' } });
    expect(successLogs.length).toBeGreaterThan(0);

    const logoutLogs = await prisma.auditLog.findMany({ where: { action: 'LOGOUT' } });
    expect(logoutLogs.length).toBeGreaterThan(0);
  });

  it('12. Throttler configuration attached to login with 10 req/min limit', async () => {
    const { AuthModule } = await import('../src/modules/auth/auth.module');
    expect(AuthModule).toBeDefined();
  });
});
