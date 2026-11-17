import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Status, TrafficChange } from '../src/generated/prisma/enums.js';
import { mapCreateRoadPermit } from '../src/modules/road-permit/mappers/road-permit.mapper.js';
import { RoadPermitRepository } from '../src/modules/road-permit/road-permit.repository.js';
import { PrismaService } from '../src/prisma.service.js';
import { roadPermitSubmission } from './fixtures/road-permit.js';

// This suite writes to PostgreSQL. Use a disposable database with migrations applied.
const databaseUrl = process.env.ROAD_PERMIT_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Road permit transactions (PostgreSQL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let permits: RoadPermitRepository;

  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', databaseUrl);
    const fixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = fixture.get(PrismaService);
    permits = fixture.get(RoadPermitRepository);
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it('rolls back the application update when the linked permit write fails', async () => {
    const { caseNumber } = await permits.create();
    const original = { title: 'Draft before submission' };
    await permits.update(caseNumber, original);
    const data = mapCreateRoadPermit(roadPermitSubmission);
    data.roadUsePermit.create.endDate = new Date(Number.NaN);

    await expect(permits.submit(caseNumber, data)).rejects.toThrow(
      'Invalid Date',
    );
    await expect(
      prisma.application.findUniqueOrThrow({
        where: { caseNumber },
        select: {
          status: true,
          title: true,
          roadPermitDraft: true,
          applicantId: true,
        },
      }),
    ).resolves.toEqual({
      status: Status.Draft,
      title: original.title,
      roadPermitDraft: original,
      applicantId: null,
    });
    expect(
      await prisma.roadUsePermit.count({
        where: { applicationId: caseNumber },
      }),
    ).toBe(0);
    await request(app.getHttpServer())
      .patch(`/api/road-permit/${caseNumber}`)
      .send({ title: 'Draft is still editable' })
      .expect(200);
  });

  it('rejects a duplicate submission and stores the traffic choices once', async () => {
    const { caseNumber } = await permits.create();
    const path = `/api/road-permit/${caseNumber}/submit`;
    const dto = {
      ...roadPermitSubmission,
      roadMarking: {
        ...roadPermitSubmission.roadMarking,
        trafficChanges: [
          'Hastighedsbegrænsning - hensyn til trafikanter og vejarbejdere',
          'Standsning og Parkering',
        ],
      },
    };

    const submissions = await Promise.all([
      request(app.getHttpServer()).post(path).send(dto),
      request(app.getHttpServer()).post(path).send(dto),
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
        select: { status: true, trafficChanges: true },
      }),
    ).resolves.toEqual({
      status: Status.InProgress,
      trafficChanges: [
        TrafficChange.SpeedLimitWorkZoneAndTrafficSafety,
        TrafficChange.NoStoppingAndParking,
      ],
    });
  });
});
