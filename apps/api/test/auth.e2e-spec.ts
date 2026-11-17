import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AUTH_CONFIG, type AuthConfig } from '../src/config/auth.config.js';
import { AuthController } from '../src/modules/auth/auth.controller.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard.js';
import { JwtService } from '../src/modules/auth/jwt/jwt.service.js';
import type { JwtClaims } from '../src/modules/auth/jwt/jwt.types.js';
import { RefreshTokenService } from '../src/modules/auth/refresh-token/refresh-token.service.js';

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

const config: AuthConfig = {
  jwt: {
    algorithm: 'HS256',
    secret: 'test-secret-with-at-least-32-characters',
    issuer: 'ansoegningsplatformen-api',
    audience: 'ansoegningsplatformen-web',
    accessTokenTtlSeconds: 600,
    onboardingTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
  },
  cookies: {
    accessName: 'sk_access',
    refreshName: 'sk_refresh',
    accessPath: '/api',
    refreshPath: '/api/auth',
    secure: false,
    sameSite: 'lax',
  },
};

const accessClaims: JwtClaims = {
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  subject: 'applicant-123',
  actor: 'APPLICANT',
  tokenUse: 'ACCESS',
  jwtId: 'jwt-123',
  issuedAtTime: 1_795_000_000,
  expirationTime: 1_795_000_600,
};

describe('Authentication routes (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: { verify: ReturnType<typeof vi.fn> };
  let refreshTokenService: {
    rotate: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    revokeAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    jwtService = { verify: vi.fn().mockReturnValue(accessClaims) };
    refreshTokenService = {
      rotate: vi.fn().mockResolvedValue({
        accessToken: 'replacement-access-token',
        refreshToken: 'replacement-refresh-token',
        refreshTokenExpiresAt: new Date(Date.now() + 604_800_000),
      }),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeAll: vi.fn().mockResolvedValue(2),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: AUTH_CONFIG, useValue: config },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for a protected route without an access cookie', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('returns authentication state for a valid access cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'sk_access=access-token')
      .expect(200)
      .expect({
        subject: 'applicant-123',
        actor: 'APPLICANT',
        tokenUse: 'ACCESS',
      });
  });

  it('rotates the public refresh cookie and returns replacement cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', 'sk_refresh=current-refresh-token')
      .expect(204);

    expect(refreshTokenService.rotate).toHaveBeenCalledWith(
      'current-refresh-token',
    );
    const rawCookies = response.headers['set-cookie'];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : typeof rawCookies === 'string'
        ? [rawCookies]
        : [];
    const accessCookie = cookies.find((cookie) =>
      cookie.startsWith('sk_access='),
    );
    const refreshCookie = cookies.find((cookie) =>
      cookie.startsWith('sk_refresh='),
    );

    expect(accessCookie).toContain('sk_access=replacement-access-token');
    expect(accessCookie).toContain('Max-Age=600');
    expect(accessCookie).toContain('Path=/api');
    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).toContain('SameSite=Lax');
    expect(refreshCookie).toContain('sk_refresh=replacement-refresh-token');
    expect(refreshCookie).toContain('Path=/api/auth');
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
  });

  it('rejects refresh when the refresh cookie is missing', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    expect(refreshTokenService.rotate).not.toHaveBeenCalled();
  });

  it('revokes the current refresh token and clears both cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', 'sk_access=access-token; sk_refresh=current-refresh-token')
      .expect(204);

    expect(refreshTokenService.revoke).toHaveBeenCalledWith(
      'current-refresh-token',
    );
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sk_access=; Path=/api;'),
        expect.stringContaining('sk_refresh=; Path=/api/auth;'),
      ]),
    );
  });

  it('revokes every refresh token for logout-all', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/logout-all')
      .set('Cookie', 'sk_access=access-token')
      .expect(204);

    expect(refreshTokenService.revokeAll).toHaveBeenCalledWith({
      subject: 'applicant-123',
      actor: 'APPLICANT',
    });
  });
});
