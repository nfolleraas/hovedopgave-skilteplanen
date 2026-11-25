import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Status } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';
import { mapCreateRoadPermit } from '../src/modules/road-permit/mappers/road-permit.mapper.js';
import { RoadPermitRepository } from '../src/modules/road-permit/road-permit.repository.js';
import { addContactPerson } from './fixtures/contact-person.js';
import { roadPermitSubmission } from './fixtures/road-permit.js';

// This suite writes to PostgreSQL. Use a disposable database with migrations applied.
const databaseUrl = process.env.DATABASE_URL;

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

  it('rejects a submission without a contact person and keeps the draft', async () => {
    const { caseNumber } = await permits.create();
    await request(app.getHttpServer())
      .post(`/api/road-permit/${caseNumber}/submit`)
      .send(roadPermitSubmission)
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('CONTACT_PERSON_REQUIRED'));
    await expect(
      prisma.application.findUniqueOrThrow({
        where: { caseNumber },
        select: { status: true },
      }),
    ).resolves.toEqual({ status: Status.Draft });
  });

  it('rolls back the application update when the linked permit write fails', async () => {
    const { caseNumber } = await permits.create();
    const original = { title: 'Draft before submission' };
    await permits.update(caseNumber, original);
    await addContactPerson(prisma, caseNumber);
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
});
