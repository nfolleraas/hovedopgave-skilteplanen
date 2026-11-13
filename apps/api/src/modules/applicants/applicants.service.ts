import { Injectable } from '@nestjs/common';
import type { Applicant } from '../../generated/prisma/client.js';
import { ApplicantsRepository } from './applicants.repository.js';
import { validateCreateApplicant } from './applicants.validator.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';
import { mapApplicantCreateError } from './mappers/applicant-error.mapper.js';

@Injectable()
export class ApplicantsService {
  constructor(private readonly applicantsRepository: ApplicantsRepository) {}

  /**
   * Creates a new applicant after normalizing and validating input.
   */
  async createApplicant(data: CreateApplicantDto): Promise<Applicant> {
    const normalizedData: CreateApplicantDto = {
      ...data,
      email: data.email.trim().toLowerCase(),
      cvrNumber: data.cvrNumber?.trim() || undefined,
    };

    validateCreateApplicant(normalizedData);

    try {
      return await this.applicantsRepository.createApplicant(normalizedData);
    } catch (error: unknown) {
      mapApplicantCreateError(error);
    }
  }
}
