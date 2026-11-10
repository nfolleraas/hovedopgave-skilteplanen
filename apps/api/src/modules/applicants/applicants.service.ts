import { Injectable } from '@nestjs/common';
import type { Applicant } from '../../generated/prisma/client.js';
import { ApplicantsRepository } from './applicants.repository.js';
import { validateCreateApplicant } from './applicants.validator.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Injectable()
export class ApplicantsService {
  constructor(private readonly applicantsRepository: ApplicantsRepository) {}

  async createApplicant(data: CreateApplicantDto): Promise<Applicant> {
    validateCreateApplicant(data);
    return this.applicantsRepository.createApplicant(data);
  }
}
