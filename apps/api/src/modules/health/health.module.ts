import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { HealthRepository } from './health.repository.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
})
export class HealthModule {}
