import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma.service.js';

describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;
  const prisma = {
    $queryRaw: vi.fn(),
    municipalityLookup: { findMany: vi.fn() },
    application: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('serves the health endpoint required by the development launcher', async () => {
    prisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect('Healthy');
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('serves municipality choices through the shared Prisma provider', async () => {
    const municipalities = [{ id: 1, name: 'Odense' }];
    prisma.municipalityLookup.findMany.mockResolvedValue(municipalities);

    await request(app.getHttpServer())
      .get('/api/municipalities')
      .expect(200)
      .expect(municipalities);
    expect(prisma.municipalityLookup.findMany).toHaveBeenCalledOnce();
  });

  it('keeps the frontend draft creation, saving, and loading endpoints available', async () => {
    const draft = { caseNumber: 'permit-1', status: 'Draft' };
    const snapshot = { title: 'Road work', municipalityName: 'Odense' };
    prisma.application.create.mockResolvedValue(draft);
    prisma.application.updateMany.mockResolvedValue({ count: 1 });
    prisma.application.findFirst.mockResolvedValue({
      ...draft,
      roadPermitDraft: snapshot,
    });

    await request(app.getHttpServer())
      .post('/api/road-permit')
      .send({})
      .expect(201)
      .expect(draft);
    await request(app.getHttpServer())
      .patch('/api/road-permit/permit-1')
      .send(snapshot)
      .expect(200)
      .expect(draft);
    await request(app.getHttpServer())
      .get('/api/road-permit/permit-1')
      .expect(200)
      .expect({ ...draft, roadPermitDraft: snapshot });
    expect(prisma.application.create).toHaveBeenCalledOnce();
    expect(prisma.application.updateMany).toHaveBeenCalledOnce();
    expect(prisma.application.findFirst).toHaveBeenCalledOnce();
  });

  afterEach(async () => {
    await app.close();
  });
});
