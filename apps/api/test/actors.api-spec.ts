import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  ActorRole,
  ApplicantType,
  ApplicationType,
  Availability,
  TrafficChange,
} from '../src/generated/prisma/enums.js';
import { ActorsModule } from '../src/modules/actors/actors.module.js';
import { ActorsRepository } from '../src/modules/actors/actors.repository.js';
import { ActorsService } from '../src/modules/actors/actors.service.js';
import type { CreateActorDto } from '../src/modules/actors/dto/create-actor.dto.js';
import { ActorMapper } from '../src/modules/actors/mappers/actor.mapper.js';
import { AddressRepository } from '../src/modules/address/address.repository.js';
import { AddressService } from '../src/modules/address/address.service.js';
import { ApplicationsRepository } from '../src/modules/applications/applications.repository.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

describe('ActorsService database write', () => {
  const marker = randomUUID();
  const caseNumber = `TEST-${marker}`;
  const prisma = new PrismaService();
  const repository = new ActorsRepository(prisma);
  const mapper = new ActorMapper();
  const applicationsRepository = new ApplicationsRepository(prisma);
  const addressService = new AddressService(new AddressRepository(prisma));
  const service = new ActorsService(
    applicationsRepository,
    repository,
    mapper,
    addressService,
  );
  const dto: CreateActorDto = {
    applicationCaseNumber: caseNumber,
    role: ActorRole.Contractor,
    name: 'Test Entreprise',
    phoneNumber: '12345678',
    email: `actor-${marker}@example.com`,
    cvrNumber: '12345678',
    department: 'Test',
    address: {
      street: `Testvej ${marker}`,
      houseNumber: '1',
      postalCode: '5000',
      city: 'Odense',
    },
    contactPerson: {
      name: 'Jane Doe',
      email: `contact-${marker}@example.com`,
      phoneNumber: '87654321',
    },
  };
  const actorIds: string[] = [];
  const addressIds: string[] = [];
  const placeholderContact = {
    name: 'PLACEHOLDER kontaktperson',
    email: 'placeholder@example.com',
    phoneNumber: '00000000',
    availability: Availability.AllDay,
    applicationId: caseNumber,
  };
  let applicantId: string | undefined;
  let applicantAddressId: string | undefined;
  let applicationCreated = false;
  let app: INestApplication;

  beforeAll(async () => {
    await prisma.$connect();
    const application = await prisma.application.create({
      data: {
        caseNumber,
        title: 'Test application',
        applicantReference: `REF-${marker}`,
        type: ApplicationType.RoadUsePermit,
        trafficChanges: [TrafficChange.SpeedLimitWorkZone],
        applicant: {
          create: {
            name: 'Test Applicant',
            type: ApplicantType.Business,
            phoneNumber: '12345678',
            email: `applicant-${marker}@example.com`,
            mitIdKey: `MIT-${marker}`,
            address: {
              create: {
                street: 'Applicant Road',
                houseNumber: '1',
                postalCode: '5000',
                city: 'Odense',
              },
            },
          },
        },
      },
      include: { applicant: true },
    });
    applicationCreated = true;
    if (
      application.applicantId === null ||
      !application.applicant ||
      application.applicant.addressId === null
    ) {
      throw new Error(
        'Actor test fixture must include an applicant with an address.',
      );
    }
    applicantId = application.applicantId;
    applicantAddressId = application.applicant.addressId;

    const module = await Test.createTestingModule({
      imports: [ActorsModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (applicationCreated) {
      await prisma.contactPerson.deleteMany({
        where: { applicationId: caseNumber },
      });
      for (const uuid of actorIds) {
        await prisma.actor.delete({ where: { uuid } });
      }
      for (const uuid of new Set(addressIds)) {
        await prisma.address.delete({ where: { uuid } });
      }
      await prisma.application.delete({ where: { caseNumber } });
      if (applicantId)
        await prisma.applicant.delete({ where: { uuid: applicantId } });
      if (applicantAddressId) {
        await prisma.address.delete({ where: { uuid: applicantAddressId } });
      }
    }
    await prisma.$disconnect();
  }, 30_000);

  it('persists actors, addresses and application links atomically', async () => {
    const saved = await service.create(dto);
    actorIds.push(saved.uuid);
    addressIds.push(saved.address.uuid);

    expect(saved.address.street).toBe(dto.address.street);
    expect(saved.contactPersons).toEqual([
      {
        ...placeholderContact,
        uuid: expect.any(String),
        actorId: saved.uuid,
      },
    ]);
    expect(
      await prisma.actor.findUnique({
        where: { uuid: saved.uuid },
        include: { address: true, contactPersons: true },
      }),
    ).toEqual(saved);

    const second = await service.create({
      ...dto,
      cvrNumber: '10000001',
      email: `second-${marker}@example.com`,
      address: { ...dto.address, street: `Second street ${marker}` },
      contactPerson: {
        name: 'Second Contact',
        phoneNumber: '87654321',
        email: `second-contact-${marker}@example.com`,
      },
    });
    actorIds.push(second.uuid);
    addressIds.push(second.address.uuid);
    expect(
      await prisma.contactPerson.count({
        where: { applicationId: caseNumber },
      }),
    ).toBe(2);
    const failedStreet = `Failed street ${marker}`;
    const duplicateIdMapper = Object.assign(new ActorMapper(), {
      toCreateInput: (...args: Parameters<ActorMapper['toCreateInput']>) => ({
        ...mapper.toCreateInput(...args),
        uuid: saved.uuid,
      }),
    });
    const duplicateIdService = new ActorsService(
      applicationsRepository,
      repository,
      duplicateIdMapper,
      addressService,
    );

    await expect(
      duplicateIdService.create({
        ...dto,
        cvrNumber: '10000002',
        address: { ...dto.address, street: failedStreet },
      }),
    ).rejects.toThrow();

    expect(await prisma.actor.count({ where: { email: dto.email } })).toBe(1);
    expect(
      await prisma.address.count({ where: { street: failedStreet } }),
    ).toBe(0);
  });

  it('creates an actor through the HTTP endpoint and rejects invalid contact details', async () => {
    const validPayload = {
      ...dto,
      cvrNumber: '10000003',
      email: `http-${marker}@example.com`,
      address: { ...dto.address, street: `HTTP street ${marker}` },
      contactPerson: {
        name: 'HTTP Contact',
        email: `http-contact-${marker}@example.com`,
        phoneNumber: '11223344',
      },
    };
    const response = await request(app.getHttpServer())
      .post('/api/actors')
      .send(validPayload)
      .expect(201);
    actorIds.push(response.body.uuid);
    addressIds.push(response.body.address.uuid);
    expect(response.body.contactPersons).toEqual([
      {
        ...placeholderContact,
        uuid: expect.any(String),
        actorId: response.body.uuid,
      },
    ]);

    const listing = await request(app.getHttpServer())
      .get('/api/actors')
      .expect(200);
    expect(listing.body.map((actor: { uuid: string }) => actor.uuid)).toContain(
      response.body.uuid,
    );

    await request(app.getHttpServer())
      .post('/api/actors')
      .send({
        ...validPayload,
        email: `invalid-${marker}@example.com`,
        contactPerson: { ...validPayload.contactPerson, phoneNumber: 'bad' },
      })
      .expect(400);
    expect(
      await prisma.actor.count({
        where: { email: `invalid-${marker}@example.com` },
      }),
    ).toBe(0);
  });

  it('rejects duplicate CVRs even during simultaneous creates and permits editing itself', async () => {
    const payload = {
      ...dto,
      cvrNumber: '60000000',
      email: `concurrent-${marker}@example.com`,
    };
    const results = await Promise.allSettled([
      service.create(payload),
      service.create({
        ...payload,
        email: `concurrent-other-${marker}@example.com`,
      }),
    ]);
    const saved = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    for (const actor of saved) {
      actorIds.push(actor.uuid);
      addressIds.push(actor.address.uuid);
    }
    expect(saved).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const response = await request(app.getHttpServer())
      .post('/api/actors')
      .send(payload)
      .expect(409);
    expect(response.body.field).toBe('cvrNumber');
    await request(app.getHttpServer())
      .patch(`/api/actors/${saved[0].uuid}`)
      .send({ email: payload.email })
      .expect(200);
  });

  it('rejects duplicate emails without CVR regardless of case and rejects conflicting edits', async () => {
    const email = `private-${marker}@example.com`;
    const payload = { ...dto, role: ActorRole.Private, email };
    const first = await service.create(payload);
    const second = await service.create({
      ...payload,
      email: `other-${email}`,
    });
    for (const actor of [first, second]) {
      actorIds.push(actor.uuid);
      addressIds.push(actor.address.uuid);
    }
    const response = await request(app.getHttpServer())
      .post('/api/actors')
      .send({ ...payload, email: email.toUpperCase() })
      .expect(409);
    expect(response.body.field).toBe('email');
    await request(app.getHttpServer())
      .patch(`/api/actors/${second.uuid}`)
      .send({ email: email.toUpperCase() })
      .expect(409);
    expect((await repository.get(second.uuid))?.email).toBe(`other-${email}`);
  });

  it('reuses an existing address only when all four trimmed fields match', async () => {
    const address = {
      ...dto.address,
      street: `Shared street ${marker}`,
    };
    const existing = await prisma.address.create({ data: address });
    addressIds.push(existing.uuid);

    for (let index = 0; index < 2; index++) {
      const response = await request(app.getHttpServer())
        .post('/api/actors')
        .send({
          ...dto,
          cvrNumber: String(20000000 + index),
          email: `shared-${index}-${marker}@example.com`,
          address: {
            street: ` ${address.street} `,
            houseNumber: ` ${address.houseNumber} `,
            postalCode: ` ${address.postalCode} `,
            city: ` ${address.city} `,
          },
        })
        .expect(201);
      actorIds.push(response.body.uuid);
      expect(response.body.address.uuid).toBe(existing.uuid);
    }
    const directActor = await service.create({
      ...dto,
      cvrNumber: '30000000',
      address,
      email: `direct-shared-${marker}@example.com`,
    });
    actorIds.push(directActor.uuid);
    expect(directActor.address.uuid).toBe(existing.uuid);

    expect(await prisma.address.count({ where: address })).toBe(1);

    for (const field of [
      'street',
      'houseNumber',
      'postalCode',
      'city',
    ] as const) {
      const response = await request(app.getHttpServer())
        .post('/api/actors')
        .send({
          ...dto,
          cvrNumber: String(
            40000000 +
              ['street', 'houseNumber', 'postalCode', 'city'].indexOf(field),
          ),
          email: `different-${field}-${marker}@example.com`,
          address: { ...address, [field]: `${address[field]}2` },
        })
        .expect(201);
      actorIds.push(response.body.uuid);
      addressIds.push(response.body.address.uuid);
      expect(response.body.address.uuid).not.toBe(existing.uuid);
    }
  });

  it('changes one actor address without modifying an address shared by another actor', async () => {
    const address = {
      ...dto.address,
      street: `Update shared street ${marker}`,
    };
    const existing = await prisma.address.create({ data: address });
    addressIds.push(existing.uuid);
    const sharedActorIds: string[] = [];
    for (let index = 0; index < 2; index++) {
      const response = await request(app.getHttpServer())
        .post('/api/actors')
        .send({
          ...dto,
          cvrNumber: String(50000000 + index),
          address,
          email: `update-${index}-${marker}@example.com`,
        })
        .expect(201);
      actorIds.push(response.body.uuid);
      sharedActorIds.push(response.body.uuid);
      expect(response.body.address.uuid).toBe(existing.uuid);
    }

    const response = await request(app.getHttpServer())
      .patch(`/api/actors/${sharedActorIds[0]}`)
      .send({ address: { ...address, houseNumber: '99' } })
      .expect(200);
    addressIds.push(response.body.address.uuid);
    expect(response.body.address.uuid).not.toBe(existing.uuid);
    expect(response.body.address.houseNumber).toBe('99');
    expect(
      await prisma.actor.findUnique({ where: { uuid: sharedActorIds[1] } }),
    ).toMatchObject({ addressId: existing.uuid });
    expect(
      await prisma.address.findUnique({ where: { uuid: existing.uuid } }),
    ).toMatchObject(address);

    const reconnected = await request(app.getHttpServer())
      .patch(`/api/actors/${sharedActorIds[0]}`)
      .send({ address })
      .expect(200);
    expect(reconnected.body.address.uuid).toBe(existing.uuid);
    expect(await prisma.address.count({ where: address })).toBe(1);
  });
});
