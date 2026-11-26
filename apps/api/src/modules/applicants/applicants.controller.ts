import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import type { Applicant } from '../../generated/prisma/client.js';
import type { ApplicantProfile } from './applicants.repository.js';
import { ApplicantsService } from './applicants.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Controller('applicants')
export class ApplicantsController {
  constructor(private readonly applicantsService: ApplicantsService) {}

  @Get('profile')
  getProfile(): Promise<ApplicantProfile> {
    return this.applicantsService.getProfile();
  }

  @Patch('profile')
  updateProfile(@Body() data: unknown): Promise<ApplicantProfile> {
    return this.applicantsService.updateProfile(data);
  }

  /**
   * Creates a new applicant.
   */
  @Post()
  createApplicant(@Body() data: CreateApplicantDto): Promise<Applicant> {
    return this.applicantsService.createApplicant(data);
  }
}
