import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import {
  ActorRole,
  ApplicantType,
  ApplicationType,
  Status,
  TrafficChange,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

/**
 * Runs the contact persons endpoints against the database in DATABASE_URL.
 * Every test application gets a unique case number, and afterAll removes the
 * records the tests created.
 */
describe('/api/contact-persons (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const run = randomUUID().slice(0, 8);
  const created = {
    caseNumbers: [] as string[],
    applicantIds: [] as string[],
    addressIds: [] as string[],
    actorIds: [] as string[],
  };

  async function createAddress(): Promise<string> {
    const { uuid } = await prisma.address.create({
      data: {
        street: 'Cikorievej',
        houseNumber: '1',
        postalCode: '5220',
        city: 'Odense SØ',
      },
    });
    created.addressIds.push(uuid);
    return uuid;
  }

  async function createActor(caseNumber: string, name: string) {
    const actor = await prisma.actor.create({
      data: {
        name,
        role: ActorRole.Contractor,
        phoneNumber: '11111111',
        email: `${name.replaceAll(' ', '.').toLowerCase()}@example.com`,
        address: { connect: { uuid: await createAddress() } },
        applications: { connect: { caseNumber } },
      },
    });
    created.actorIds.push(actor.uuid);
    return actor;
  }

  /** A draft application with one actor, unless other values are given. */
  async function createApplication(
    suffix: string,
    {
      type = ApplicationType.ExcavationPermit,
      status = Status.Draft,
    }: { type?: ApplicationType; status?: Status } = {},
  ) {
    const caseNumber = `E2E-CP-${run}-${suffix}`;
    const applicant = await prisma.applicant.create({
      data: {
        name: `E2E ${caseNumber}`,
        type: ApplicantType.Business,
        phoneNumber: '12345678',
        email: `${caseNumber.toLowerCase()}@example.com`,
        mitIdKey: `e2e-${caseNumber}`,
        address: { connect: { uuid: await createAddress() } },
      },
    });
    created.applicantIds.push(applicant.uuid);
    await prisma.application.create({
      data: {
        caseNumber,
        title: `E2E ${caseNumber}`,
        applicantReference: caseNumber,
        type,
        status,
        trafficChange: TrafficChange.SpeedLimitWorkZone,
        applicant: { connect: { uuid: applicant.uuid } },
      },
    });
    created.caseNumbers.push(caseNumber);
    const actor = await createActor(caseNumber, `Aktør ${caseNumber}`);
    return { caseNumber, actor };
  }

  const validContact = {
    name: 'Jens Jensen',
    availability: 'Evening',
    phoneNumber: '12345678',
    email: 'jens@example.com',
  };

  function post(body: object) {
    return request(app.getHttpServer()).post('/api/contact-persons').send(body);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      const caseNumber = { in: created.caseNumbers };
      // Also collects the records the dev endpoint created.
      const applications = await prisma.application.findMany({
        where: { caseNumber },
        select: {
          applicant: { select: { uuid: true, addressId: true } },
          actors: { select: { uuid: true, addressId: true } },
        },
      });
      for (const { applicant, actors } of applications) {
        created.applicantIds.push(applicant.uuid);
        created.addressIds.push(applicant.addressId);
        for (const actor of actors) {
          created.actorIds.push(actor.uuid);
          created.addressIds.push(actor.addressId);
        }
      }
      await prisma.contactPerson.deleteMany({
        where: { applicationId: caseNumber },
      });
      await prisma.actor.deleteMany({
        where: { uuid: { in: created.actorIds } },
      });
      await prisma.application.deleteMany({ where: { caseNumber } });
      await prisma.applicant.deleteMany({
        where: { uuid: { in: created.applicantIds } },
      });
      await prisma.address.deleteMany({
        where: { uuid: { in: created.addressIds } },
      });
    }
    await app?.close();
  });

  it('creates, lists, updates and deletes a contact person (UC-031, UC-033, UC-032)', async () => {
    const { caseNumber, actor } = await createApplication('crud');

    const createResponse = await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...validContact,
    }).expect(201);
    const contact = createResponse.body;
    expect(contact).toMatchObject({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...validContact,
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/contact-persons')
      .query({ applicationId: caseNumber })
      .expect(200);
    expect(listResponse.body).toEqual({
      application: { caseNumber, type: 'ExcavationPermit', status: 'Draft' },
      actors: [{ uuid: actor.uuid, name: actor.name, role: 'Contractor' }],
      contactPersons: [contact],
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/contact-persons/${contact.uuid}`)
      .send({ name: 'Ny Kontakt', phoneNumber: '87654321' })
      .expect(200);
    expect(updateResponse.body).toMatchObject({
      name: 'Ny Kontakt',
      phoneNumber: '87654321',
      availability: 'Evening',
    });

    await request(app.getHttpServer())
      .delete(`/api/contact-persons/${contact.uuid}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/contact-persons/${contact.uuid}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe('CONTACT_PERSON_NOT_FOUND');
      });
  });

  it('allows several contact persons per actor and per application', async () => {
    const { caseNumber, actor } = await createApplication('multi');
    const secondActor = await createActor(caseNumber, `Aktør 2 ${run}`);

    for (const actorId of [actor.uuid, actor.uuid, secondActor.uuid]) {
      await post({
        applicationId: caseNumber,
        actorId,
        ...validContact,
      }).expect(201);
    }

    const listResponse = await request(app.getHttpServer())
      .get('/api/contact-persons')
      .query({ applicationId: caseNumber })
      .expect(200);
    const actorIds = listResponse.body.contactPersons.map(
      (contact: { actorId: string }) => contact.actorId,
    );
    expect(actorIds.filter((id: string) => id === actor.uuid)).toHaveLength(2);
    expect(actorIds).toContain(secondActor.uuid);
  });

  it('rejects an actor that is not on the application', async () => {
    const { caseNumber } = await createApplication('actor-a');
    const { actor: otherActor } = await createApplication('actor-b');

    const response = await post({
      applicationId: caseNumber,
      actorId: otherActor.uuid,
      ...validContact,
    }).expect(404);
    expect(response.body.code).toBe('ACTOR_NOT_FOUND');
  });

  it('rejects a missing application', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/contact-persons')
      .query({ applicationId: `E2E-CP-${run}-missing` })
      .expect(404);
    expect(response.body.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('lists the invalid fields (UC-031 F1, F2, F4)', async () => {
    const { caseNumber, actor } = await createApplication('invalid');

    const response = await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      name: ' ',
      phoneNumber: '12345678',
      email: 'jens@',
    }).expect(400);

    expect(response.body).toMatchObject({
      code: 'CONTACT_PERSON_INVALID',
      invalidFields: ['name', 'availability', 'email'],
    });
  });

  it('rejects a phone number that is not 8 digits in the DTO (UC-031 F3)', async () => {
    const { caseNumber, actor } = await createApplication('phone');

    // The DTO rejects the format before the service runs, so the body is
    // Nest's validation error and not { code, invalidFields }.
    const response = await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...validContact,
      phoneNumber: '1234567',
    }).expect(400);

    expect(response.body.message).toEqual(['phoneNumber must be 8 digits']);
  });

  it('rejects unknown fields through the global ValidationPipe', async () => {
    const { caseNumber, actor } = await createApplication('unknown');

    await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...validContact,
      title: 'Not a contact person field',
    }).expect(400);
  });

  it('uses Day for road use applications and rejects a chosen availability (UC-031 A1)', async () => {
    const { caseNumber, actor } = await createApplication('road', {
      type: ApplicationType.RoadUsePermit,
    });

    const rejected = await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...validContact,
    }).expect(400);
    expect(rejected.body.code).toBe('CONTACT_PERSON_FIELDS_NOT_ALLOWED');

    const { availability: _, ...withoutAvailability } = validContact;
    const response = await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...withoutAvailability,
    }).expect(201);
    expect(response.body.availability).toBe('Day');
  });

  it('dev applications come with two actors to add contact persons to', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/dev/applications')
      .send({ type: 'RoadUsePermit' })
      .expect(201);
    const { caseNumber } = createResponse.body;
    created.caseNumbers.push(caseNumber);

    const listResponse = await request(app.getHttpServer())
      .get('/api/contact-persons')
      .query({ applicationId: caseNumber })
      .expect(200);

    expect(
      listResponse.body.actors.map((actor: { role: string }) => actor.role),
    ).toEqual(['Contractor', 'NetworkOperator']);
    expect(listResponse.body.contactPersons).toEqual([]);
  });

  it('rejects changes when the application cannot be edited', async () => {
    const { caseNumber, actor } = await createApplication('approved', {
      status: Status.Approved,
    });

    const response = await post({
      applicationId: caseNumber,
      actorId: actor.uuid,
      ...validContact,
    }).expect(409);
    expect(response.body.code).toBe('APPLICATION_NOT_EDITABLE');
  });
});
