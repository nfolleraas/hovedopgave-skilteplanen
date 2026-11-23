import { randomBytes, scryptSync } from 'node:crypto';
import { type INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module.js';
import {
  ApplicantType,
  ApplicationType,
  TrafficChange,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CaseWorkersRepository } from './case-workers.repository.js';
import { CaseWorkersService } from './case-workers.service.js';

/** Exercises the caseworker use cases against PostgreSQL and removes its fixtures afterward. */
async function verifyCaseWorkerLifecycle(): Promise<void> {
  const prisma = new PrismaService();
  const service = new CaseWorkersService(new CaseWorkersRepository(prisma));
  const marker = randomBytes(4).toString('hex');
  const actorEmployeeNumber = `SU${marker}`;
  const input = {
    employeeNumber: `00${marker}`,
    name: 'Anne Müller',
    email: `anne+${marker}@example.test`,
    phoneNumber: '12345678',
    password: 'Test+🔑',
    isSuperUser: false,
  };
  let fixture: { id: number; addressId: string } | undefined;

  let applicationFixture:
    | { applicantId: string; applicant: { addressId: string } }
    | undefined;
  const caseNumber = `CASE-${marker}`;
  let notificationIds: string[] = [];
  let app: INestApplication<App> | undefined;

  try {
    fixture = await prisma.municipality.create({
      data: {
        name: `Caseworker test ${marker}`,
        region: 'Region Syddanmark',
        email: `municipality-${marker}@example.test`,
        phoneNumber: '12345678',
        address: {
          create: {
            street: 'Vestergade',
            houseNumber: '2',
            postalCode: '5000',
            city: 'Odense C',
          },
        },
        caseWorkers: {
          create: {
            employeeNumber: actorEmployeeNumber,
            name: 'Test Superuser',
            email: `superuser-${marker}@example.test`,
            phoneNumber: '12345678',
            passwordHash: 'unused-test-fixture',
            isSuperUser: true,
          },
        },
      },
      select: { id: true, addressId: true },
    });

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    const client = request(app.getHttpServer());
    const collectionPath = '/api/case-workers';
    const workerPath = `${collectionPath}/${input.employeeNumber}`;

    vi.stubEnv('CASE_WORKER_DEMO_EMPLOYEE_NUMBER', actorEmployeeNumber);
    vi.stubEnv('NODE_ENV', 'production');
    await client.get(collectionPath).expect(503);
    await client.get(workerPath).expect(503);
    await client.post(collectionPath).send(input).expect(503);
    await client.patch(workerPath).send(input).expect(503);
    await client.delete(workerPath).expect(503);
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('CASE_WORKER_DEMO_EMPLOYEE_NUMBER', '');
    await client
      .post(collectionPath)
      .set('x-employee-number', actorEmployeeNumber)
      .send(input)
      .expect(503);
    vi.stubEnv('CASE_WORKER_DEMO_EMPLOYEE_NUMBER', actorEmployeeNumber);

    const { body: created } = await client
      .post(collectionPath)
      .send(input)
      .expect(201);

    expect(created).toEqual({
      employeeNumber: input.employeeNumber,
      name: input.name,
      email: input.email,
      phoneNumber: input.phoneNumber,
      municipalityId: fixture.id,
      isSuperUser: false,
    });

    const { body: listed } = await client.get(collectionPath).expect(200);
    expect(listed).toEqual([
      created,
      {
        employeeNumber: actorEmployeeNumber,
        name: 'Test Superuser',
        email: `superuser-${marker}@example.test`,
        phoneNumber: '12345678',
        municipalityId: fixture.id,
        isSuperUser: true,
      },
    ]);
    const { body: details } = await client.get(workerPath).expect(200);
    expect(details).toEqual(created);
    vi.stubEnv('CASE_WORKER_DEMO_EMPLOYEE_NUMBER', input.employeeNumber);
    await client.get(collectionPath).expect(403);
    await client.get(workerPath).expect(403);
    vi.stubEnv('CASE_WORKER_DEMO_EMPLOYEE_NUMBER', actorEmployeeNumber);

    const saved = await prisma.caseWorker.findUniqueOrThrow({
      where: { employeeNumber: input.employeeNumber },
    });
    expect(saved).toMatchObject(created);
    const [algorithm, salt, hash] = saved.passwordHash.split(':');
    expect(algorithm).toBe('scrypt');
    expect(hash).toBe(scryptSync(input.password, salt, 64).toString('hex'));

    await expect(
      service.create(actorEmployeeNumber, {
        ...input,
        email: `other-${marker}@example.test`,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Employee number already exists',
    });
    await expect(
      service.create(actorEmployeeNumber, {
        ...input,
        employeeNumber: `01${marker}`,
        email: input.email.toUpperCase(),
      }),
    ).rejects.toMatchObject({
      status: 409,
      message:
        'A caseworker with this email already exists in this municipality',
    });
    expect(
      await prisma.caseWorker.count({
        where: { municipalityId: fixture.id },
      }),
    ).toBe(2);

    const update = {
      name: 'Anne Marie Müller',
      email: `updated+${marker}@example.test`,
      phoneNumber: '87654321',
      isSuperUser: true,
    };
    await expect(
      service.update(actorEmployeeNumber, input.employeeNumber, {
        ...update,
        email: `superuser-${marker}@example.test`,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.update(input.employeeNumber, actorEmployeeNumber, update),
    ).rejects.toMatchObject({ status: 403 });

    const audit = vi.spyOn(Logger.prototype, 'log');
    try {
      const { body: updated } = await client
        .patch(workerPath)
        .send(update)
        .expect(200);
      expect(updated).toMatchObject({
        ...update,
        employeeNumber: input.employeeNumber,
        municipalityId: fixture.id,
      });
      expect(audit).toHaveBeenCalledWith({
        action: 'caseWorker.updated',
        actorEmployeeNumber,
        employeeNumber: input.employeeNumber,
        timestamp: expect.any(String),
      });

      const secondUpdate = { ...update, isSuperUser: false };
      await service.update(
        actorEmployeeNumber,
        input.employeeNumber,
        secondUpdate,
      );
      await service.update(
        actorEmployeeNumber,
        input.employeeNumber,
        secondUpdate,
      );
      expect(audit).toHaveBeenCalledTimes(2);
      expect(
        await prisma.notification.count({
          where: { caseWorkerId: input.employeeNumber },
        }),
      ).toBe(2);
      expect(
        await prisma.caseWorker.findUniqueOrThrow({
          where: { employeeNumber: input.employeeNumber },
        }),
      ).toMatchObject({ ...secondUpdate, passwordHash: saved.passwordHash });
    } finally {
      audit.mockRestore();
    }

    applicationFixture = await prisma.application.create({
      data: {
        caseNumber,
        title: 'Caseworker deletion test',
        applicantReference: marker,
        type: ApplicationType.RoadUsePermit,
        trafficChange: TrafficChange.SpeedLimitWorkZone,
        caseWorker: { connect: { employeeNumber: input.employeeNumber } },
        applicant: {
          create: {
            name: 'Test Applicant',
            type: ApplicantType.Private,
            phoneNumber: '12345678',
            email: `applicant-${marker}@example.test`,
            address: {
              create: {
                street: 'Vestergade',
                houseNumber: '4',
                postalCode: '5000',
                city: 'Odense C',
              },
            },
          },
        },
        feedbacks: {
          create: {
            category: 'Test',
            message: 'Feedback survives caseworker deletion',
            caseWorker: { connect: { employeeNumber: input.employeeNumber } },
          },
        },
      },
      select: { applicantId: true, applicant: { select: { addressId: true } } },
    });
    notificationIds = (
      await prisma.notification.findMany({
        where: { caseWorkerId: input.employeeNumber },
        select: { uuid: true },
      })
    ).map(({ uuid }) => uuid);

    await expect(
      service.delete(input.employeeNumber, actorEmployeeNumber),
    ).rejects.toMatchObject({ status: 403 });
    const deletionAudit = vi.spyOn(Logger.prototype, 'log');
    try {
      await client.delete(workerPath).expect(204);
      await client.get(workerPath).expect(404);
      expect(deletionAudit).toHaveBeenCalledWith({
        action: 'caseWorker.deleted',
        actorEmployeeNumber,
        employeeNumber: input.employeeNumber,
        releasedCases: 1,
        timestamp: expect.any(String),
      });
    } finally {
      deletionAudit.mockRestore();
    }
    expect(
      await prisma.caseWorker.findUnique({
        where: { employeeNumber: input.employeeNumber },
      }),
    ).toBeNull();
    expect(
      await prisma.application.findMany({
        where: { municipalityId: fixture.id, caseWorkerId: null },
        select: {
          caseNumber: true,
          feedbacks: { select: { caseWorkerId: true, message: true } },
        },
      }),
    ).toEqual([
      {
        caseNumber,
        feedbacks: [
          {
            caseWorkerId: null,
            message: 'Feedback survives caseworker deletion',
          },
        ],
      },
    ]);
    await expect(
      service.delete(actorEmployeeNumber, input.employeeNumber),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.delete(actorEmployeeNumber, actorEmployeeNumber),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      await prisma.caseWorker.count({ where: { municipalityId: fixture.id } }),
    ).toBe(1);
  } finally {
    try {
      if (applicationFixture) {
        await prisma.$transaction([
          prisma.feedback.deleteMany({ where: { applicationId: caseNumber } }),
          prisma.application.delete({ where: { caseNumber } }),
          prisma.applicant.delete({
            where: { uuid: applicationFixture.applicantId },
          }),
          prisma.address.delete({
            where: { uuid: applicationFixture.applicant.addressId },
          }),
        ]);
      }
      if (fixture) {
        await prisma.$transaction([
          prisma.notification.deleteMany({
            where: {
              OR: [
                { caseWorker: { municipalityId: fixture.id } },
                { uuid: { in: notificationIds } },
              ],
            },
          }),
          prisma.caseWorker.deleteMany({
            where: { municipalityId: fixture.id },
          }),
          prisma.municipality.delete({ where: { id: fixture.id } }),
          prisma.address.delete({ where: { uuid: fixture.addressId } }),
        ]);
      }
    } finally {
      vi.unstubAllEnvs();
      if (app) {
        await app.close();
      } else {
        await prisma.$disconnect();
      }
    }
  }
}

it(
  'creates, updates, and deletes a caseworker in the superuser’s municipality',
  verifyCaseWorkerLifecycle,
);
