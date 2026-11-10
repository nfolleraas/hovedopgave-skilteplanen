import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class ActorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ActorCreateInput) {
    return this.prisma.actor.create({
      data,
      include: { address: true, contactPersons: true },
    });
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
