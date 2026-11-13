import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
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
