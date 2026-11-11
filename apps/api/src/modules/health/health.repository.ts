import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  checkDatabase() {
    return this.prisma.$queryRaw`SELECT 1`;
  }
}
