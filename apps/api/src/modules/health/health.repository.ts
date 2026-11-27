import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks database connectivity by executing a minimal query.
   * @returns The query result when the database responds
   */
  checkDatabase(): Promise<unknown> {
    return this.prisma.$queryRaw`SELECT 1`;
  }
}
