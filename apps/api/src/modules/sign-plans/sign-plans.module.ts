import { Module } from '@nestjs/common';
import { SignPlansController } from './sign-plans.controller.js';
import { SignPlansRepository } from './sign-plans.repository.js';
import { SignPlansService } from './sign-plans.service.js';

@Module({
  controllers: [SignPlansController],
  providers: [SignPlansService, SignPlansRepository],
})
export class SignPlansModule {}
