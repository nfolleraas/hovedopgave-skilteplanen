import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module.js';
import { ApplicantsController } from './applicants.controller.js';
import { ApplicantsRepository } from './applicants.repository.js';
import { ApplicantsService } from './applicants.service.js';

@Module({
  imports: [AddressesModule],
  controllers: [ApplicantsController],
  providers: [ApplicantsRepository, ApplicantsService],
})
export class ApplicantsModule {}
