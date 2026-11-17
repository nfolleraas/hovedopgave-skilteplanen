import { Injectable } from '@nestjs/common';
import { type Actor, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ActorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @summary Create an actor and return its address and contact persons. */
  create(data: Prisma.ActorCreateInput) {
    return this.prisma.actor.create({
      data,
      include: { address: true, contactPersons: true },
    });
  }

  /** @summary Update an actor, returning null if the actor is missing. */
  async update(uuid: string, data: Prisma.ActorUpdateInput) {
    try {
      return await this.prisma.actor.update({
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
        const actor = await this.prisma.actor.findUnique({ where: { uuid } });
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
    return this.prisma.actor.findUnique({
      where: { uuid },
      include: { address: true, contactPersons: true },
    });
  }

  /** @summary List all actors with their addresses and contact persons. */
  getAll() {
    return this.prisma.actor.findMany({
      include: { address: true, contactPersons: true },
    });
  }
}
