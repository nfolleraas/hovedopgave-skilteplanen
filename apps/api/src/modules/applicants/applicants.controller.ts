import { Body, Controller, Post } from '@nestjs/common';
import { ApplicantsService } from './applicants.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Controller('applicants')
export class ApplicantsController {
  constructor(private readonly applicantsService: ApplicantsService) {}

  @Post()
  createApplicant(@Body() data: CreateApplicantDto) {
    return this.applicantsService.createApplicant(data);
  }
}
