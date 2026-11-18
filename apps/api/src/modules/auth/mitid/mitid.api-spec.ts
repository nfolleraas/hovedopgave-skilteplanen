import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import { MitidController } from './mitid.controller.js';
import { MitidService } from './mitid.service.js';

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

describe('MitID authentication API', () => {
  let app: INestApplication<App>;
  let service: {
    startPrivate: ReturnType<typeof vi.fn>;
    startBusiness: ReturnType<typeof vi.fn>;
    callback: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      startPrivate: vi
        .fn()
        .mockResolvedValue('https://signicat.example/authorize-private'),
      startBusiness: vi
        .fn()
        .mockResolvedValue('https://signicat.example/authorize-business'),
      callback: vi.fn().mockResolvedValue({
        loginType: 'PRIVATE_APPLICANT',
        returnPath: null,
        identity: { subject: 'provider-subject' },
        status: 'authenticated',
        session: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          refreshTokenExpiresAt: new Date(Date.now() + 604_800_000),
        },
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MitidController],
      providers: [
        { provide: MitidService, useValue: service },
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

  it('redirects private login to the server-created authorization URL', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/mitid/private/start?returnPath=%2Fapplications')
      .expect(302)
      .expect('Location', 'https://signicat.example/authorize-private');

    expect(service.startPrivate).toHaveBeenCalledWith('/applications');
  });

  it('sets session cookies without exposing provider claims', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/mitid/callback?state=state&code=code')
      .expect(200)
      .expect({ status: 'authenticated', loginType: 'PRIVATE_APPLICANT' });

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

  it('returns registration-required without setting session cookies', async () => {
    service.callback.mockResolvedValueOnce({
      loginType: 'PRIVATE_APPLICANT',
      returnPath: null,
      identity: { subject: 'provider-subject' },
      status: 'registration-required',
    });

    const response = await request(app.getHttpServer())
      .get('/api/auth/mitid/callback?state=state&code=code')
      .expect(200)
      .expect({
        status: 'registration-required',
        loginType: 'PRIVATE_APPLICANT',
      });

    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
