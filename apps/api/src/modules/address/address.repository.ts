import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @summary Find the first address matching all supplied fields, or null. */
  findMatching(address: Prisma.AddressCreateManyInput) {
    return this.prisma.address.findFirst({ where: address });
  }
}
