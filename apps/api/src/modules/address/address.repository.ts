import { Injectable } from '@nestjs/common';
import type { Address, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds the first address matching all supplied fields, or null.
   * @param address - Address fields that must all match
   * @returns The first matching address, or null if none exists
   */
  findMatching(
    address: Prisma.AddressCreateManyInput,
  ): Promise<Address | null> {
    return this.prisma.address.findFirst({ where: address });
  }
}
