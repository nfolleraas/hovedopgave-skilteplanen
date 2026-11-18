import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/modules/prisma/prisma.service.js';

describe('Municipalities API (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let prisma: PrismaService | undefined;
  const marker = randomUUID();
  const initial = {
    name: `E2E Municipality ${marker}`,
    region: 'Region Syddanmark',
    email: `initial-${marker}@example.test`,
    phoneNumber: '12345678',
    address: {
      street: 'Vestergade',
      houseNumber: '2',
      postalCode: '5000',
      city: 'Odense C',
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
          const fixtures = await tx.municipality.findMany({
            where: { name: { in: [initial.name, `${initial.name} changed`] } },
            select: { id: true, addressId: true },
          });
          await tx.municipality.deleteMany({
            where: { id: { in: fixtures.map(({ id }) => id) } },
          });
          await tx.address.deleteMany({
            where: { uuid: { in: fixtures.map(({ addressId }) => addressId) } },
          });
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('creates, updates, and reads a municipality through the public routes', async () => {
    if (!app) throw new Error('The test application did not start');
    const client = request(app.getHttpServer());
    const created = await client
      .post('/api/municipalities')
      .send(initial)
      .expect(201);
    expect(created.body).toMatchObject(initial);

    const path = `/api/municipalities/${created.body.id}`;
    const updated = {
      email: `updated-${marker}@example.test`,
      phoneNumber: '87654321',
      address: { ...initial.address, houseNumber: '4' },
    };

    await client
      .patch(path)
      .send({
        ...updated,
        name: `${initial.name} changed`,
        region: 'Region Sjælland',
      })
      .expect(200);
    await client
      .patch(path)
      .send({ ...updated, phoneNumber: '123' })
      .expect(400)
      .expect(({ body }) =>
        expect(body).toMatchObject({ code: 'invalidPhoneNumber' }),
      );

    const result = await client.get(path).expect(200);
    expect(result.body).toMatchObject({
      ...updated,
      name: initial.name,
      region: initial.region,
      addressId: created.body.addressId,
    });
  });
});
