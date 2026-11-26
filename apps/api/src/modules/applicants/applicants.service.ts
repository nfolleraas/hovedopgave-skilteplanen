import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type Applicant, Prisma } from '../../generated/prisma/client.js';
import {
  type ApplicantProfile,
  ApplicantsRepository,
} from './applicants.repository.js';
import {
  validateCreateApplicant,
  validateProfile,
} from './applicants.validator.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';
import { mapApplicantCreateError } from './mappers/applicant-error.mapper.js';

@Injectable()
export class ApplicantsService {
  private readonly logger = new Logger(ApplicantsService.name);

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

  getProfile(): Promise<ApplicantProfile> {
    return this.findProfile(this.getProfileApplicantId());
  }

  async updateProfile(input: unknown): Promise<ApplicantProfile> {
    const uuid = this.getProfileApplicantId();
    const profile = await this.findProfile(uuid);
    const data = validateProfile(input, profile.type === 'Business');

    let updatedProfile: ApplicantProfile;
    try {
      updatedProfile = await this.applicantsRepository.updateActiveProfile(
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

    this.logger.log({
      actorApplicantId: uuid,
      actorSource: 'developmentProfile',
      applicantName: updatedProfile.name,
      timestamp: new Date().toISOString(),
      type: updatedProfile.type,
      change: 'updated',
    });

    return updatedProfile;
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
      street: data.street.trim().normalize('NFC').replace(/ +/g, ' '),
      city: data.city.trim().normalize('NFC').replace(/ +/g, ' '),
      houseNumber: data.houseNumber.toUpperCase(),
    };

    let applicant: Applicant;
    try {
      applicant =
        await this.applicantsRepository.createApplicant(normalizedData);
    } catch (error: unknown) {
      mapApplicantCreateError(error, { includeField: true });
    }

    this.logger.log({
      applicantName: applicant.name,
      timestamp: new Date().toISOString(),
      type: applicant.type,
      change: 'created',
    });

    return applicant;
  }
}
