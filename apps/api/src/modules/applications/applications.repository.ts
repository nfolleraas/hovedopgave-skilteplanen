import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ApplicationCreateInput) {
    return this.prisma.application.create({ data });
  }

  update(caseNumber: string, data: Prisma.ApplicationUpdateInput) {
    return this.prisma.application.update({ where: { caseNumber }, data });
  }

  delete(caseNumber: string) {
    return this.prisma.application.delete({ where: { caseNumber } });
  }

  get(caseNumber: string) {
    return this.prisma.application.findUnique({ where: { caseNumber } });
  }

  getAll() {
    return this.prisma.application.findMany();
  }
}
