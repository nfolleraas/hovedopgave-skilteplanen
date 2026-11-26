import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('Applicants API', () => {
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
      expect(
        await prisma.auditLog.count({
          where: { targetApplicantId: applicant.uuid },
        }),
      ).toBe(0);

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
      expect(
        await prisma.auditLog.findMany({
          where: { targetApplicantId: applicant.uuid },
        }),
      ).toEqual([
        expect.objectContaining({
          action: 'applicant.updated',
          actorApplicantId: applicant.uuid,
          createdAt: expect.any(Date),
          details: {
            actorSource: 'developmentProfile',
            applicantName: update.name,
            type: 'Private',
          },
        }),
      ]);
    } finally {
      vi.unstubAllEnvs();
      await prisma.auditLog.deleteMany({
        where: { targetApplicantId: applicant.uuid },
      });
      await prisma.applicant.delete({ where: { uuid: applicant.uuid } });
      if (applicant.addressId) {
        await prisma.address.delete({ where: { uuid: applicant.addressId } });
      }
    }
  });

  it('creates an applicant and its address', async () => {
    const email = `applicant-e2e-${randomUUID()}@example.com`;

    try {
      const response = await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'Test Applicant',
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
        name: 'Test Applicant',
        type: 'Private',
        email,
        mitIdKey: null,
      });

      const savedApplicant = await prisma.applicant.findUnique({
        where: { uuid: applicantUuid },
        include: { address: true },
      });
      expect(
        await prisma.auditLog.findMany({
          where: { targetApplicantId: applicantUuid },
        }),
      ).toEqual([
        expect.objectContaining({
          action: 'applicant.created',
          actorApplicantId: null,
          createdAt: expect.any(Date),
          details: { applicantName: 'Test Applicant', type: 'Private' },
        }),
      ]);

      expect(savedApplicant).toMatchObject({
        name: 'Test Applicant',
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
        await prisma.auditLog.deleteMany({
          where: { targetApplicantId: savedApplicant.uuid },
        });
        await prisma.applicant.delete({ where: { uuid: savedApplicant.uuid } });
        if (savedApplicant.addressId) {
          await prisma.address.deleteMany({
            where: {
              uuid: savedApplicant.addressId,
              applicants: { none: {} },
              municipality: null,
            },
          });
        }
      }
    }
  });

  it('reuses an address for two applicants', async () => {
    const email = `address-${randomUUID()}@example.com`;
    const secondEmail = `second-${email}`;
    const client = request(app.getHttpServer());
    const input = {
      name: 'Test Applicant',
      type: 'private',
      phoneNumber: '12345678',
      email,
      street: 'Vestergade',
      houseNumber: '2',
      postalCode: '8000',
      city: 'Aarhus C',
    };

    try {
      const [first, second] = await Promise.all([
        client.post('/applicants').send(input).expect(201),
        client
          .post('/applicants')
          .send({ ...input, email: secondEmail })
          .expect(201),
      ]);
      expect(first.body.addressId).toEqual(expect.any(String));
      expect(second.body.addressId).toBe(first.body.addressId);
    } finally {
      const where = { email: { in: [email, secondEmail] } };
      const fixtures = await prisma.applicant.findMany({
        where,
        select: { uuid: true, addressId: true },
      });
      await prisma.auditLog.deleteMany({
        where: { targetApplicantId: { in: fixtures.map(({ uuid }) => uuid) } },
      });
      await prisma.applicant.deleteMany({ where });
      await prisma.address.deleteMany({
        where: {
          uuid: {
            in: fixtures.flatMap(({ addressId }) =>
              addressId ? [addressId] : [],
            ),
          },
          applicants: { none: {} },
          municipality: null,
        },
      });
    }
  });

  it('rejects duplicate applicants by email (case-insensitive)', async () => {
    const email = `Applicant-E2E-${randomUUID()}@Example.com`;
    const normalizedEmail = email.toLowerCase();

    try {
      await request(app.getHttpServer())
        .post('/applicants')
        .send({
          name: 'Test Applicant',
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
          name: 'Second Test Applicant',
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
        await prisma.auditLog.deleteMany({
          where: { targetApplicantId: savedApplicant.uuid },
        });
        await prisma.applicant.delete({ where: { uuid: savedApplicant.uuid } });
        if (savedApplicant.addressId) {
          await prisma.address.deleteMany({
            where: {
              uuid: savedApplicant.addressId,
              applicants: { none: {} },
              municipality: null,
            },
          });
        }
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
          name: 'Test Business Applicant',
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
          name: 'Test Business Applicant 2',
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
        await prisma.auditLog.deleteMany({
          where: { targetApplicantId: savedApplicant.uuid },
        });
        await prisma.applicant.delete({ where: { uuid: savedApplicant.uuid } });
        if (savedApplicant.addressId) {
          await prisma.address.deleteMany({
            where: {
              uuid: savedApplicant.addressId,
              applicants: { none: {} },
              municipality: null,
            },
          });
        }
      }
    }
  });
});
