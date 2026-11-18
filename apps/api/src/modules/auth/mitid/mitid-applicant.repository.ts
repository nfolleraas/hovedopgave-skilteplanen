import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type PrivateApplicantLoginRecord = {
  uuid: string;
  isActive: boolean;
};

@Injectable()
export class MitidApplicantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPrivateByMitidKey(
    mitidKey: string,
  ): Promise<PrivateApplicantLoginRecord | null> {
    return this.prisma.applicant.findFirst({
      where: { type: 'Private', mitIdKey: mitidKey },
      select: { uuid: true, isActive: true },
    });
  }
}
