import { Module } from '@nestjs/common';
import { ApplicantsController } from './applicants.controller.js';
import { ApplicantsRepository } from './applicants.repository.js';
import { ApplicantsService } from './applicants.service.js';

@Module({
  controllers: [ApplicantsController],
  providers: [ApplicantsRepository, ApplicantsService],
})
export class ApplicantsModule {}
