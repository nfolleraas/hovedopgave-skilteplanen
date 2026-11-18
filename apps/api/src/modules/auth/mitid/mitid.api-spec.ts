import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { MitidController } from './mitid.controller.js';
import { MitidService } from './mitid.service.js';

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
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MitidController],
      providers: [{ provide: MitidService, useValue: service }],
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

  it('accepts a callback without exposing provider claims', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/mitid/callback?state=state&code=code')
      .expect(200)
      .expect({ status: 'authenticated', loginType: 'PRIVATE_APPLICANT' });

    expect(service.callback).toHaveBeenCalledWith({
      state: 'state',
      code: 'code',
      error: undefined,
    });
  });
});
