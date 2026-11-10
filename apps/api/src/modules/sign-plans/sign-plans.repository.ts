import { Injectable } from '@nestjs/common';
import { Prisma, SignPlan } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SignPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(signPlan: Prisma.SignPlanCreateInput): Promise<SignPlan> {
    return await this.prisma.signPlan.create({ data: signPlan });
  }

  async getById(uuid: string): Promise<SignPlan> {
    return await this.prisma.signPlan.findUniqueOrThrow({
      where: { documentId: uuid },
    });
  }
}
