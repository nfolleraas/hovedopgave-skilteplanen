import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import { MunicipalityController } from './municipality.controller.js';
import { MunicipalityService } from './municipality.service.js';

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

describe('Municipality authentication API', () => {
  let app: INestApplication<App>;
  let service: {
    start: ReturnType<typeof vi.fn>;
    callback: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      start: vi
        .fn()
        .mockResolvedValue('http://localhost:8080/realms/demo/authorize'),
      callback: vi.fn().mockResolvedValue({
        loginType: 'MUNICIPALITY',
        returnPath: '/cases',
        status: 'authenticated',
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          refreshTokenExpiresAt: new Date(Date.now() + 604_800_000),
        },
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MunicipalityController],
      providers: [
        { provide: MunicipalityService, useValue: service },
        { provide: AUTH_CONFIG, useValue: config },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('redirects login through the backend-created authorization URL', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/municipality/start?returnPath=%2Fcases')
      .expect(302)
      .expect('Location', 'http://localhost:8080/realms/demo/authorize');

    expect(service.start).toHaveBeenCalledWith('/cases');
  });

  it('sets Skilteplanen cookies without returning Keycloak claims', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/municipality/callback?state=state&code=code')
      .expect(200)
      .expect({ status: 'authenticated', loginType: 'MUNICIPALITY' });

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sk_access=access-token'),
        expect.stringContaining('sk_refresh=refresh-token'),
      ]),
    );
    expect(service.callback).toHaveBeenCalledWith({
      state: 'state',
      code: 'code',
      error: undefined,
    });
  });
});
