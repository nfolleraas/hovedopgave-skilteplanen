import { createHash, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { JwtService } from '../src/modules/auth/jwt/jwt.service.js';
import { PasswordService } from '../src/modules/auth/password/password.service.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

vi.hoisted(() => {
  process.env.AUTH_JWT_SECRET = 'test-secret-with-at-least-32-characters';
  process.env.AUTH_JWT_ISSUER = 'ansoegningsplatformen-api';
  process.env.AUTH_JWT_AUDIENCE = 'ansoegningsplatformen-web';
  process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '600';
  process.env.AUTH_ONBOARDING_TOKEN_TTL_SECONDS = '900';
  process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = '604800';
  process.env.AUTH_ACCESS_COOKIE_NAME = 'sk_access';
  process.env.AUTH_REFRESH_COOKIE_NAME = 'sk_refresh';
  process.env.AUTH_ACCESS_COOKIE_PATH = '/api';
  process.env.AUTH_REFRESH_COOKIE_PATH = '/api/auth';
  process.env.AUTH_COOKIE_SECURE = 'false';
});

describe('Administrator login route (e2e)', () => {
  const administratorId = randomUUID();
  const email = `admin-e2e-${administratorId}@example.com`;
  const password = 'correct horse battery staple';
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = app.get(JwtService);
    prisma = app.get(PrismaService);
    const passwordService = app.get(PasswordService);
    const passwordHash = await passwordService.hash(password);

    await prisma.administrator.create({
      data: {
        uuid: administratorId,
        name: 'E2E Administrator',
        email,
        passwordHash,
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { actor: 'ADMINISTRATOR', principalId: administratorId },
    });
    await prisma.authAuditEvent.deleteMany({
      where: { principalId: administratorId },
    });
    await prisma.administrator.deleteMany({
      where: { uuid: administratorId },
    });
    await app.close();
  });

  it('authenticates through the real stack and persists the session and audit event', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ email: ` ${email.toUpperCase()} `, password })
      .expect(204);
    const cookies = response.headers['set-cookie'] ?? [];
    const accessCookie = cookies.find((cookie) =>
      cookie.startsWith('sk_access='),
    );
    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith('sk_refresh='),
    );

    expect(accessCookie).toContain('Path=/api;');
    expect(accessCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth;');
    expect(refreshCookie).toContain('HttpOnly');

    const accessToken = accessCookie
      ?.split(';', 1)[0]
      ?.slice('sk_access='.length);
    const refreshToken = refreshCookie
      ?.split(';', 1)[0]
      ?.slice('sk_refresh='.length);
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(jwtService.verify(accessToken ?? '')).toMatchObject({
      subject: administratorId,
      actor: 'ADMINISTRATOR',
      tokenUse: 'ACCESS',
    });

    const storedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: createHash('sha256')
          .update(refreshToken ?? '')
          .digest('hex'),
      },
    });
    const successAuditEvent = await prisma.authAuditEvent.findFirst({
      where: {
        eventType: 'LOGIN_SUCCESS',
        principalId: administratorId,
        provider: 'LOCAL',
        success: true,
      },
    });

    expect(storedRefreshToken).toMatchObject({
      principalId: administratorId,
      actor: 'ADMINISTRATOR',
    });
    expect(successAuditEvent).not.toBeNull();
  });

  it('returns the generic credential error and persists a failed audit event', async () => {
    const auditEventsBefore = await prisma.authAuditEvent.count({
      where: {
        eventType: 'LOGIN_FAILURE',
        principalId: administratorId,
      },
    });
    const response = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password.');
    expect(response.headers['set-cookie']).toBeUndefined();
    await expect(
      prisma.authAuditEvent.count({
        where: {
          eventType: 'LOGIN_FAILURE',
          principalId: administratorId,
        },
      }),
    ).resolves.toBe(auditEventsBefore + 1);
  });
});
