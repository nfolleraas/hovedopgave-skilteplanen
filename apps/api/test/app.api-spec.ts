import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { TrafficChange } from './../src/generated/prisma/enums.js';
import { PrismaService } from './../src/prisma.service.js';

describe('AppModule (api)', () => {
  let app: INestApplication<App>;
  const prisma = {
    $queryRaw: vi.fn(),
    municipality: { findMany: vi.fn() },
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
    prisma.municipality.findMany.mockResolvedValue(municipalities);

    await request(app.getHttpServer())
      .get('/api/municipalities')
      .expect(200)
      .expect(municipalities);
    expect(prisma.municipality.findMany).toHaveBeenCalledExactlyOnceWith({
      select: { id: true, name: true },
    });
  });

  it('keeps the frontend draft creation, saving, and loading endpoints available', async () => {
    const draft = { caseNumber: 'permit-1', status: 'Draft' };
    const snapshot = { title: 'Road work', municipalityName: 'Odense' };
    prisma.application.create.mockResolvedValue(draft);
    prisma.application.updateMany.mockResolvedValue({ count: 1 });
    prisma.application.findFirst.mockResolvedValue({
      ...draft,
      roadPermitDraft: {
        ...snapshot,
        roadMarking: { trafficChanges: ['Standsning og Parkering'] },
      },
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
      .expect({
        ...draft,
        roadPermitDraft: {
          ...snapshot,
          roadMarking: { trafficChanges: [TrafficChange.NoStoppingAndParking] },
        },
      });
    expect(prisma.application.create).toHaveBeenCalledOnce();
    expect(prisma.application.updateMany).toHaveBeenCalledOnce();
    expect(prisma.application.findFirst).toHaveBeenCalledOnce();
  });

  it('exposes the road-permit choices as Prisma traffic change values', async () => {
    await request(app.getHttpServer())
      .get('/api/road-permit/traffic-changes')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(5);
        expect(body).toContain(TrafficChange.SpeedLimitWorkZone);
        expect(body).toContain(TrafficChange.SpeedLimitTrafficSafety);
        expect(body).not.toContain('SpeedLimitWorkZoneAndTrafficSafety');
        expect(body).not.toContain(TrafficChange.TrafficLight);
      });
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects bad submission and draft fields with a field-specific 400', async () => {
    await request(app.getHttpServer())
      .post('/api/road-permit/permit-1/submit')
      .send({ title: 42 })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('title must be a string.'),
      );
    await request(app.getHttpServer())
      .patch('/api/road-permit/permit-1')
      .send({ roadMarking: { trafficChanges: [42] } })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe(
          'roadMarking.trafficChanges[0] must be a string.',
        ),
      );
    expect(prisma.application.updateMany).not.toHaveBeenCalled();
  });

  it('reports a malformed stored draft without handing it to the form', async () => {
    prisma.application.findFirst.mockResolvedValue({
      caseNumber: 'permit-1',
      status: 'Draft',
      roadPermitDraft: { contactInformation: { email: false } },
    });
    await request(app.getHttpServer())
      .get('/api/road-permit/permit-1')
      .expect(422)
      .expect(({ body }) =>
        expect(body.message).toContain('contactInformation.email'),
      );
  });
});
