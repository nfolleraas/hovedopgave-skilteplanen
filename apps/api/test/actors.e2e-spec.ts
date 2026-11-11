import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  ActorRole,
  ApplicantType,
  ApplicationType,
  TrafficChange,
} from '../src/generated/prisma/enums.js';
import { ActorsModule } from '../src/modules/actors/actors.module.js';
import { ActorsRepository } from '../src/modules/actors/actors.repository.js';
import { ActorsService } from '../src/modules/actors/actors.service.js';
import type { CreateActorDto } from '../src/modules/actors/dto/create-actor.dto.js';
import { ActorMapper } from '../src/modules/actors/mappers/actor.mapper.js';
import { ApplicationsRepository } from '../src/modules/applications/applications.repository.js';
import { PrismaService } from '../src/prisma.service.js';

describe('ActorsService database write', () => {
  const marker = randomUUID();
  const caseNumber = `TEST-${marker}`;
  const prisma = new PrismaService();
  const repository = new ActorsRepository(prisma);
  const mapper = new ActorMapper();
  const applicationsRepository = new ApplicationsRepository(prisma);
  const service = new ActorsService(applicationsRepository, repository, mapper);
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
        trafficChange: TrafficChange.SpeedLimitWorkZone,
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
    expect(saved.contactPersons).toEqual([]);
    expect(
      await prisma.actor.findUnique({
        where: { uuid: saved.uuid },
        include: { address: true, contactPersons: true },
      }),
    ).toEqual(saved);

    const second = await service.create({
      ...dto,
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
    ).toBe(0);
    const failedStreet = `Failed street ${marker}`;
    const duplicateIdMapper = Object.assign(new ActorMapper(), {
      toCreateInput: (input: CreateActorDto) => ({
        ...mapper.toCreateInput(input),
        uuid: saved.uuid,
      }),
    });
    const duplicateIdService = new ActorsService(
      applicationsRepository,
      repository,
      duplicateIdMapper,
    );

    await expect(
      duplicateIdService.create({
        ...dto,
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
    expect(response.body.contactPersons).toEqual([]);

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
