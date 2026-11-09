import { Injectable } from '@nestjs/common';
import { validateCreateApplicant } from './applicants.validator.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Injectable()
export class ApplicantsService {
  createApplicant(data: CreateApplicantDto): void {
    validateCreateApplicant(data);
  }
}
