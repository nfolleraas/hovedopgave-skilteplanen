import { Injectable } from '@nestjs/common';
import { Prisma, SignPlan } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SignPlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a sign plan and its related records.
   * @param signPlan - The sign plan data to create
   * @returns The created sign plan
   */
  async add(signPlan: Prisma.SignPlanCreateInput): Promise<SignPlan> {
    return await this.prisma.signPlan.create({ data: signPlan });
  }

  /**
   * Retrieves a sign plan by its related document identifier.
   * @param uuid - The related document identifier
   * @returns The matching sign plan
   */
  async getById(uuid: string): Promise<SignPlan> {
    return await this.prisma.signPlan.findUniqueOrThrow({
      where: { documentId: uuid },
      include: { document: true },
    });
  }
}
