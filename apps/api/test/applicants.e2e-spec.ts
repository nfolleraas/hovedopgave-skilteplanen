import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/modules/prisma/prisma.service.js';

describe('Applicants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('updates only the configured development profile and rejects invalid input', async () => {
    const email = `profile-e2e-${randomUUID()}@example.com`;
    const applicant = await prisma.applicant.create({
      data: {
        name: 'Original name',
        type: 'Private',
        phoneNumber: '12345678',
        email,
        address: {
          create: {
            street: 'Vestergade',
            houseNumber: '1',
            postalCode: '8000',
            city: 'Aarhus C',
          },
        },
      },
    });

    try {
      const api = request(app.getHttpServer());
      const path = '/applicants/profile';
      const update = { name: 'Updated name', email, phoneNumber: '87654321' };
      vi.stubEnv('DEV_PROFILE_APPLICANT_ID', applicant.uuid);
      vi.stubEnv('NODE_ENV', 'production');
      await api.get(path).expect(404);
      await api.patch(path).send(update).expect(404);

      vi.stubEnv('NODE_ENV', 'development');
      const invalid = await api
        .patch(path)
        .send({ ...update, phoneNumber: '123' })
        .expect(400);
      expect(invalid.body.fields).toEqual(['phoneNumber']);

      const original = await api.get(path).expect(200);
      expect(original.body).toEqual({
        name: 'Original name',
        email,
        phoneNumber: '12345678',
        type: 'Private',
        cvrNumber: null,
      });

      const result = await api
        .patch(path)
        .send({ ...update, type: 'Business', cvrNumber: '12345678' })
        .expect(200);
      expect(result.body).toEqual({
        ...update,
        type: 'Private',
        cvrNumber: null,
      });
      const saved = await prisma.applicant.findUniqueOrThrow({
        where: { uuid: applicant.uuid },
      });
      expect(saved).toMatchObject({
        ...update,
        type: 'Private',
        cvrNumber: null,
      });
    } finally {
      vi.unstubAllEnvs();
      await prisma.applicant.delete({ where: { uuid: applicant.uuid } });
      await prisma.address.delete({ where: { uuid: applicant.addressId } });
    }
  });

  it('creates an applicant and its address', async () => {
    const email = `applicant-e2e-${randomUUID()}@example.com`;

    try {
      const response = await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'E2E Test Applicant',
          type: 'private',
          phoneNumber: '12345678',
          email,
          street: 'Vestergade',
          houseNumber: '1',
          postalCode: '8000',
          city: 'Aarhus C',
        })
        .expect(201);

      const applicantUuid = response.body.uuid as string;
      expect(response.body).toMatchObject({
        name: 'E2E Test Applicant',
        type: 'Private',
        email,
        mitIdKey: null,
      });

      const savedApplicant = await prisma.applicant.findUnique({
        where: { uuid: applicantUuid },
        include: { address: true },
      });

      expect(savedApplicant).toMatchObject({
        name: 'E2E Test Applicant',
        email,
        address: {
          street: 'Vestergade',
          houseNumber: '1',
          postalCode: '8000',
          city: 'Aarhus C',
        },
      });
    } finally {
      const savedApplicant = await prisma.applicant.findFirst({
        where: { email },
        select: { uuid: true, addressId: true },
      });

      if (savedApplicant) {
        await prisma.applicant.delete({ where: { uuid: savedApplicant.uuid } });
        await prisma.address.delete({
          where: { uuid: savedApplicant.addressId },
        });
      }
    }
  });

  it('rejects duplicate applicants by email (case-insensitive)', async () => {
    const email = `Applicant-E2E-${randomUUID()}@Example.com`;
    const normalizedEmail = email.toLowerCase();

    try {
      await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'E2E Test Applicant',
          type: 'private',
          phoneNumber: '12345678',
          email,
          street: 'Vestergade',
          houseNumber: '1',
          postalCode: '8000',
          city: 'Aarhus C',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'E2E Test Applicant 2',
          type: 'private',
          phoneNumber: '87654321',
          email: normalizedEmail,
          street: 'Vestergade',
          houseNumber: '2',
          postalCode: '8000',
          city: 'Aarhus C',
        })
        .expect(409);
    } finally {
      const savedApplicant = await prisma.applicant.findFirst({
        where: { email: normalizedEmail },
        select: { uuid: true, addressId: true },
      });

      if (savedApplicant) {
        await prisma.applicant.delete({ where: { uuid: savedApplicant.uuid } });
        await prisma.address.delete({
          where: { uuid: savedApplicant.addressId },
        });
      }
    }
  });

  it('rejects duplicate business applicants by CVR number', async () => {
    const email = `applicant-e2e-${randomUUID()}@example.com`;
    const cvrNumber = String(Math.floor(10000000 + Math.random() * 90000000));

    try {
      await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'E2E Test Business Applicant',
          type: 'business',
          phoneNumber: '12345678',
          email,
          cvrNumber,
          street: 'Vestergade',
          houseNumber: '1',
          postalCode: '8000',
          city: 'Aarhus C',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'E2E Test Business Applicant 2',
          type: 'business',
          phoneNumber: '87654321',
          email: `other-${email}`,
          cvrNumber,
          street: 'Vestergade',
          houseNumber: '2',
          postalCode: '8000',
          city: 'Aarhus C',
        })
        .expect(409);
    } finally {
      const savedApplicant = await prisma.applicant.findFirst({
        where: { cvrNumber },
        select: { uuid: true, addressId: true },
      });

      if (savedApplicant) {
        await prisma.applicant.delete({ where: { uuid: savedApplicant.uuid } });
        await prisma.address.delete({
          where: { uuid: savedApplicant.addressId },
        });
      }
    }
  });
});
