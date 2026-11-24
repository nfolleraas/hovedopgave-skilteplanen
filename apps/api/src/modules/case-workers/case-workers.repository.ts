import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateCaseWorkerDto } from './dto/update-case-worker.dto.js';

const publicFields = {
  employeeNumber: true,
  name: true,
  email: true,
  phoneNumber: true,
  isSuperUser: true,
  municipalityId: true,
} satisfies Prisma.CaseWorkerSelect;

export type CaseWorkerDetails = Prisma.CaseWorkerGetPayload<{
  select: typeof publicFields;
}>;

type CreateResult =
  | { caseWorker: CaseWorkerDetails }
  | { conflict: 'email' | 'employeeNumber' };

type UpdateResult =
  | { caseWorker: CaseWorkerDetails; changed: boolean }
  | { conflict: 'forbidden' | 'notFound' | 'lastSuperUser' | 'email' };

type DeleteResult =
  | { releasedCases: number }
  | { conflict: 'forbidden' | 'notFound' | 'lastCaseWorker' | 'lastSuperUser' };

/** Locks the municipality before checking the actor’s current permissions. */
async function lockActorMunicipality(
  tx: Prisma.TransactionClient,
  employeeNumber: string,
): Promise<number | null> {
  const actor = await tx.caseWorker.findUnique({
    where: { employeeNumber },
    select: { municipalityId: true },
  });
  if (!actor) {
    return null;
  }

  await tx.$executeRaw`SELECT id FROM "Municipality"
    WHERE id = ${actor.municipalityId} FOR NO KEY UPDATE`;
  const authorized = await tx.caseWorker.findFirst({
    where: {
      employeeNumber,
      municipalityId: actor.municipalityId,
      isSuperUser: true,
    },
    select: { municipalityId: true },
  });
  return authorized?.municipalityId ?? null;
}

/** Coordinates email checks across creates and updates. */
async function lockEmail(
  tx: Prisma.TransactionClient,
  email: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`;
}

@Injectable()
export class CaseWorkersRepository {
  /** Injects the shared Prisma client for caseworker queries. */
  constructor(private readonly prisma: PrismaService) {}

  /** Looks up the acting caseworker’s permissions and municipality. */
  async findActor(employeeNumber: string): Promise<{
    isSuperUser: boolean;
    municipalityId: number;
  } | null> {
    return this.prisma.caseWorker.findUnique({
      where: { employeeNumber },
      select: { isSuperUser: true, municipalityId: true },
    });
  }

  /** Lists the municipality’s caseworkers in name and employee-number order. */
  async findAllByMunicipality(
    municipalityId: number,
  ): Promise<CaseWorkerDetails[]> {
    return this.prisma.caseWorker.findMany({
      where: { municipalityId },
      orderBy: [{ name: 'asc' }, { employeeNumber: 'asc' }],
      select: publicFields,
    });
  }

  /** Finds a caseworker by employee number within the specified municipality. */
  async findByMunicipality(
    municipalityId: number,
    employeeNumber: string,
  ): Promise<CaseWorkerDetails | null> {
    return this.prisma.caseWorker.findUnique({
      where: { municipalityId, employeeNumber },
      select: publicFields,
    });
  }

  /** Stores a caseworker or reports which duplicate prevented creation. */
  async create(
    actorEmployeeNumber: string,
    data: Prisma.CaseWorkerUncheckedCreateInput,
  ): Promise<CreateResult> {
    try {
      return await this.prisma.$transaction(
        /** Checks the email and inserts the caseworker in one transaction. */
        async (tx) => {
          await lockEmail(tx, data.email);

          const existing = await tx.caseWorker.findFirst({
            where: {
              municipalityId: data.municipalityId,
              email: { equals: data.email, mode: 'insensitive' },
            },
            select: { employeeNumber: true },
          });

          if (existing) {
            return { conflict: 'email' };
          }

          const caseWorker = await tx.caseWorker.create({
            data,
            select: publicFields,
          });
          await tx.auditLog.create({
            data: {
              action: 'caseWorker.created',
              actorEmployeeNumber,
              targetEmployeeNumber: caseWorker.employeeNumber,
              details: { municipalityId: data.municipalityId },
            },
          });
          return { caseWorker };
        },
      );
    } catch (error) {
      // The primary key enforces employee-number uniqueness across municipalities.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { conflict: 'employeeNumber' };
      }
      throw error;
    }
  }

  /** Checks municipality access and saves the update and notification atomically. */
  async update(
    actorEmployeeNumber: string,
    employeeNumber: string,
    data: UpdateCaseWorkerDto,
  ): Promise<UpdateResult> {
    return this.prisma.$transaction(
      /** Serializes municipality role changes and rechecks the actor after locking. */
      async (tx) => {
        const municipalityId = await lockActorMunicipality(
          tx,
          actorEmployeeNumber,
        );
        if (municipalityId === null) {
          return { conflict: 'forbidden' };
        }

        const current = await tx.caseWorker.findFirst({
          where: { employeeNumber, municipalityId: municipalityId },
          select: publicFields,
        });
        if (!current) {
          return { conflict: 'notFound' };
        }
        if (current.isSuperUser && !data.isSuperUser) {
          const superUsers = await tx.caseWorker.count({
            where: { municipalityId: municipalityId, isSuperUser: true },
          });
          if (superUsers <= 1) {
            return { conflict: 'lastSuperUser' };
          }
        }

        if (current.email.toLowerCase() !== data.email) {
          await lockEmail(tx, data.email);
          const duplicate = await tx.caseWorker.findFirst({
            where: {
              employeeNumber: { not: employeeNumber },
              email: { equals: data.email, mode: 'insensitive' },
            },
            select: { employeeNumber: true },
          });
          if (duplicate) {
            return { conflict: 'email' };
          }
        }

        if (
          current.name === data.name &&
          current.email === data.email &&
          current.phoneNumber === data.phoneNumber &&
          current.isSuperUser === data.isSuperUser
        ) {
          return { caseWorker: current, changed: false };
        }

        const caseWorker = await tx.caseWorker.update({
          where: { employeeNumber },
          data: {
            ...data,
            notifications: {
              create: {
                message: 'Dine sagsbehandleroplysninger er blevet opdateret.',
              },
            },
          },
          select: publicFields,
        });
        await tx.auditLog.create({
          data: {
            action: 'caseWorker.updated',
            actorEmployeeNumber,
            targetEmployeeNumber: employeeNumber,
            details: {
              name: data.name,
              email: data.email,
              phoneNumber: data.phoneNumber,
              isSuperUser: data.isSuperUser,
            },
          },
        });
        return { caseWorker, changed: true };
      },
    );
  }

  /** Releases the worker’s cases and deletes the worker in one transaction. */
  async delete(
    actorEmployeeNumber: string,
    employeeNumber: string,
  ): Promise<DeleteResult> {
    return this.prisma.$transaction(
      /** Checks municipal staffing and preserves cases before removing the worker. */
      async (tx) => {
        const municipalityId = await lockActorMunicipality(
          tx,
          actorEmployeeNumber,
        );
        if (municipalityId === null || actorEmployeeNumber === employeeNumber) {
          return { conflict: 'forbidden' };
        }

        const target = await tx.caseWorker.findFirst({
          where: { employeeNumber, municipalityId },
          select: { isSuperUser: true },
        });
        if (!target) {
          return { conflict: 'notFound' };
        }

        const workers = await tx.caseWorker.count({
          where: { municipalityId },
        });
        if (workers <= 1) {
          return { conflict: 'lastCaseWorker' };
        }
        if (target.isSuperUser) {
          const superUsers = await tx.caseWorker.count({
            where: { municipalityId, isSuperUser: true },
          });
          if (superUsers <= 1) {
            return { conflict: 'lastSuperUser' };
          }
        }

        // Block new case assignments while existing assignments are released.
        await tx.$executeRaw`SELECT "employeeNumber" FROM "CaseWorker"
          WHERE "employeeNumber" = ${employeeNumber} FOR UPDATE`;
        const { count } = await tx.application.updateMany({
          where: { caseWorkerId: employeeNumber },
          data: { caseWorkerId: null, municipalityId },
        });
        await tx.caseWorker.delete({ where: { employeeNumber } });
        await tx.auditLog.create({
          data: {
            action: 'caseWorker.deleted',
            actorEmployeeNumber,
            targetEmployeeNumber: employeeNumber,
            details: { releasedCases: count, municipalityId },
          },
        });
        return { releasedCases: count };
      },
    );
  }
}
