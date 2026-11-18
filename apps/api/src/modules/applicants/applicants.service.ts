import { Injectable, NotFoundException } from '@nestjs/common';
import { type Applicant, Prisma } from '../../generated/prisma/client.js';
import { ApplicantsRepository } from './applicants.repository.js';
import {
  validateCreateApplicant,
  validateProfile,
} from './applicants.validator.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';
import { mapApplicantCreateError } from './mappers/applicant-error.mapper.js';

@Injectable()
export class ApplicantsService {
  constructor(private readonly applicantsRepository: ApplicantsRepository) {}

  private getProfileApplicantId() {
    const uuid = process.env.DEV_PROFILE_APPLICANT_ID?.trim();
    if (process.env.NODE_ENV !== 'development' || !uuid) {
      throw new NotFoundException();
    }
    return uuid;
  }

  private async findProfile(uuid: string) {
    const profile = await this.applicantsRepository.findActiveProfile(uuid);
    if (!profile) throw new NotFoundException();
    return profile;
  }

  getProfile() {
    return this.findProfile(this.getProfileApplicantId());
  }

  async updateProfile(input: unknown) {
    const uuid = this.getProfileApplicantId();
    const profile = await this.findProfile(uuid);
    const data = validateProfile(input, profile.type === 'Business');

    try {
      return await this.applicantsRepository.updateActiveProfile(
        uuid,
        profile.type,
        data,
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException();
      }
      mapApplicantCreateError(error, { includeField: true });
    }
  }

  /**
   * Creates a new applicant after normalizing and validating input.
   */
  async createApplicant(data: unknown): Promise<Applicant> {
    validateCreateApplicant(data);

    const normalizedData: CreateApplicantDto = {
      ...data,
      email: data.email.trim().toLowerCase(),
      cvrNumber: data.type === 'business' ? data.cvrNumber?.trim() : undefined,
    };

    try {
      return await this.applicantsRepository.createApplicant(normalizedData);
    } catch (error: unknown) {
      mapApplicantCreateError(error);
    }
  }
}
