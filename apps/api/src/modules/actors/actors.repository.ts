import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ActorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ActorCreateInput) {
    return this.prisma.actor.create({
      data,
      include: { address: true, contactPersons: true },
    });
  }

  update(uuid: string, data: Prisma.ActorUpdateInput) {
    return this.prisma.actor.update({
      where: { uuid },
      data,
      include: { address: true, contactPersons: true },
    });
  }

  async delete(uuid: string) {
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

  get(uuid: string) {
    return this.prisma.actor.findUnique({
      where: { uuid },
      include: { address: true, contactPersons: true },
    });
  }

  getAll() {
    return this.prisma.actor.findMany({
      include: { address: true, contactPersons: true },
    });
  }
}
