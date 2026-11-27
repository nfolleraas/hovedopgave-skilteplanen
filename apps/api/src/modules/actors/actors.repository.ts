import { Injectable } from '@nestjs/common';
import { type Actor, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type ActorWithDetails = Prisma.ActorGetPayload<{
  include: { address: true; contactPersons: true };
}>;

@Injectable()
export class ActorsRepository {
  private client: Pick<PrismaService, 'actor'>;

  constructor(private readonly prisma: PrismaService) {
    this.client = prisma;
  }

  /**
   * Keeps identity checks and writes in one serializable transaction. Retry
   * serialization conflicts so a concurrent duplicate becomes a field error.
   * @param operation - Identity checks and writes using the transaction
   *   repository
   * @returns The result of the committed operation
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

  /**
   * Creates an actor and returns its address and contact persons.
   * @param data - Actor fields and relations to create
   * @returns The created actor with its address and contact persons
   */
  create(data: Prisma.ActorCreateInput): Promise<ActorWithDetails> {
    return this.client.actor.create({
      data,
      include: { address: true, contactPersons: true },
    });
  }

  /**
   * Updates an actor, returning null if the actor is missing.
   * @param uuid - UUID of the actor to update
   * @param data - Actor fields and relations to update
   * @returns The updated actor with its details, or null if missing
   */
  async update(
    uuid: string,
    data: Prisma.ActorUpdateInput,
  ): Promise<ActorWithDetails | null> {
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
   * Deletes an actor and its contact persons atomically, returning null if the
   * actor does not exist.
   * @param uuid - UUID of the actor to delete
   * @returns The deleted actor, or null if missing
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

  /**
   * Finds an actor with its related details, returning null if absent.
   * @param uuid - UUID of the actor to find
   * @returns The actor with its related details, or null if absent
   */
  get(uuid: string): Promise<ActorWithDetails | null> {
    return this.client.actor.findUnique({
      where: { uuid },
      include: { address: true, contactPersons: true },
    });
  }

  /**
   * Lists all actors with their addresses and contact persons.
   * @param caseNumber - Optional application case number to filter by
   * @returns The matching actors with their addresses and contact persons
   */
  getAll(caseNumber?: string): Promise<ActorWithDetails[]> {
    return this.client.actor.findMany({
      ...(caseNumber
        ? { where: { applications: { some: { caseNumber } } } }
        : {}),
      include: { address: true, contactPersons: true },
    });
  }

  /**
   * Finds the same actor identity within the selected applications.
   * @param identity - CVR number, or email for an actor without a CVR number
   * @param application - Filter selecting the applications to check
   * @param excludeUuid - Optional actor UUID to exclude when checking an
   *   update
   * @returns The duplicate actor UUID, or null if no duplicate exists
   */
  findDuplicate(
    identity: { cvrNumber: string | null; email: string },
    application: Prisma.ApplicationWhereInput,
    excludeUuid?: string,
  ): Promise<Pick<Actor, 'uuid'> | null> {
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
