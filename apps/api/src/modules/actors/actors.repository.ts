import { Injectable } from '@nestjs/common';
import { type Actor, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ActorsRepository {
  private client: Pick<PrismaService, 'actor'>;

  constructor(private readonly prisma: PrismaService) {
    this.client = prisma;
  }

  /**
   * @summary Keep identity checks and writes in one serializable transaction.
   * Retry serialization conflicts so a concurrent duplicate becomes a field error.
   */
  async withTransaction<T>(
    operation: (
      repository: Pick<
        ActorsRepository,
        'create' | 'update' | 'get' | 'findDuplicate'
      >,
    ) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          (transaction) => {
            const repository = new ActorsRepository(this.prisma);
            repository.client = transaction;
            return operation(repository);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
  }

  /** @summary Create an actor and return its address and contact persons. */
  create(data: Prisma.ActorCreateInput) {
    return this.client.actor.create({
      data,
      include: { address: true, contactPersons: true },
    });
  }

  /** @summary Update an actor, returning null if the actor is missing. */
  async update(uuid: string, data: Prisma.ActorUpdateInput) {
    try {
      return await this.client.actor.update({
        where: { uuid },
        data,
        include: { address: true, contactPersons: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // Missing relations can also cause P2025; only report a missing actor
        // when the actor itself no longer exists.
        const actor = await this.client.actor.findUnique({ where: { uuid } });
        if (!actor) return null;
      }
      throw error;
    }
  }

  /**
   * @summary Delete an actor and its contact persons atomically,
   * returning null if the actor does not exist.
   */
  async delete(uuid: string): Promise<Actor | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.contactPerson.deleteMany({
          where: { actorId: uuid },
        });

        return transaction.actor.delete({ where: { uuid } });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return null;
      }
      throw error;
    }
  }

  /** @summary Find an actor with its related details, returning null if absent. */
  get(uuid: string) {
    return this.client.actor.findUnique({
      where: { uuid },
      include: { address: true, contactPersons: true },
    });
  }

  /** @summary List all actors with their addresses and contact persons. */
  getAll(caseNumber?: string) {
    return this.client.actor.findMany({
      ...(caseNumber
        ? { where: { applications: { some: { caseNumber } } } }
        : {}),
      include: { address: true, contactPersons: true },
    });
  }

  /** @summary Find the same actor identity within the selected applications. */
  findDuplicate(
    identity: { cvrNumber: string | null; email: string },
    application: Prisma.ApplicationWhereInput,
    excludeUuid?: string,
  ) {
    const cvrNumber = identity.cvrNumber?.trim();
    return this.client.actor.findFirst({
      where: {
        applications: { some: application },
        ...(excludeUuid ? { uuid: { not: excludeUuid } } : {}),
        ...(cvrNumber
          ? { cvrNumber }
          : {
              cvrNumber: null,
              email: { equals: identity.email.trim(), mode: 'insensitive' },
            }),
      },
      select: { uuid: true },
    });
  }
}
