import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import type { Applicant } from '../../generated/prisma/client.js';
import type { ApplicantProfile } from './applicants.repository.js';
import { ApplicantsService } from './applicants.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Controller('applicants')
export class ApplicantsController {
  /**
   * Creates the controller with its applicant service.
   *
   * @param applicantsService - Service that handles applicant operations.
   */
  constructor(private readonly applicantsService: ApplicantsService) {}

  /**
   * Handles requests to read the configured development profile.
   *
   * @returns The editable fields of the active applicant.
   */
  @Get('profile')
  getProfile(): Promise<ApplicantProfile> {
    return this.applicantsService.getProfile();
  }

  /**
   * Handles requests to update the configured development profile.
   *
   * @param data - Untrusted profile fields from the request body.
   * @returns The saved profile fields.
   */
  @Patch('profile')
  updateProfile(@Body() data: unknown): Promise<ApplicantProfile> {
    return this.applicantsService.updateProfile(data);
  }

  /**
   * Handles requests to create a private or business applicant.
   *
   * @param data - Applicant and address fields from the request body.
   * @returns The created applicant.
   */
  @Post()
  createApplicant(@Body() data: CreateApplicantDto): Promise<Applicant> {
    return this.applicantsService.createApplicant(data);
  }
}
