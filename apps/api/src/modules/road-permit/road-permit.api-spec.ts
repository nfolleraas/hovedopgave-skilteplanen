import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { roadPermitSubmission } from '../../../test/fixtures/road-permit.js';
import { AppModule } from '../../app.module.js';
import { Status, TrafficChange } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

// This suite writes to PostgreSQL. Use a disposable database with migrations applied.
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('Road permit API (PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', databaseUrl);
    const fixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    prisma = fixture.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it.each(['patch', 'post'] as const)(
    'keeps service validation for invalid %s bodies with the global pipe enabled',
    async (method) => {
      const path = '/api/road-permit/invalid-body';
      await request(app.getHttpServer())
        [method](method === 'post' ? `${path}/submit` : path)
        .send({ title: 42 })
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe('title must be a string.');
        });
    },
  );

  it('stores the road markings on submission and rejects a duplicate', async () => {
    const { body: draft } = await request(app.getHttpServer())
      .post('/api/road-permit')
      .send({})
      .expect(201);
    const { caseNumber } = draft;
    const path = `/api/road-permit/${caseNumber}`;
    const accessWays = 'Access from the south via the service road.';
    const dto = {
      ...roadPermitSubmission,
      roadMarking: {
        ...roadPermitSubmission.roadMarking,
        accessWays,
        trafficChanges: [
          TrafficChange.SpeedLimitWorkZone,
          TrafficChange.SpeedLimitTrafficSafety,
          TrafficChange.NoStoppingAndParking,
        ],
      },
    };
    await request(app.getHttpServer())
      .patch(path)
      .send({ roadMarking: dto.roadMarking })
      .expect(200);

    const submissions = await Promise.all([
      request(app.getHttpServer()).post(`${path}/submit`).send(dto),
      request(app.getHttpServer()).post(`${path}/submit`).send(dto),
    ]);
    expect(submissions.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await prisma.roadUsePermit.count({
        where: { applicationId: caseNumber },
      }),
    ).toBe(1);
    await expect(
      prisma.application.findUniqueOrThrow({
        where: { caseNumber },
        select: {
          status: true,
          trafficChanges: true,
          accessWays: true,
          roadPermitDraft: true,
        },
      }),
    ).resolves.toEqual({
      status: Status.InProgress,
      accessWays,
      roadPermitDraft: null,
      trafficChanges: [
        TrafficChange.SpeedLimitWorkZone,
        TrafficChange.SpeedLimitTrafficSafety,
        TrafficChange.NoStoppingAndParking,
      ],
    });
  });
});
