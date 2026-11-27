import { Injectable } from '@nestjs/common';
import type { Application, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ApplicationCreateInput): Promise<Application> {
    return this.prisma.application.create({ data });
  }

  update(
    caseNumber: string,
    data: Prisma.ApplicationUpdateInput,
  ): Promise<Application> {
    return this.prisma.application.update({ where: { caseNumber }, data });
  }

  delete(caseNumber: string): Promise<Application> {
    return this.prisma.application.delete({ where: { caseNumber } });
  }

  get(caseNumber: string): Promise<Application | null> {
    return this.prisma.application.findUnique({ where: { caseNumber } });
  }

  getAll(): Promise<Application[]> {
    return this.prisma.application.findMany();
  }
}
