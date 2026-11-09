import { Module } from '@nestjs/common';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { ApplicantsModule } from './modules/applicants/applicants.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';

@Module({
  imports: [AddressesModule, ApplicantsModule, HealthModule, PrismaModule],
})
export class AppModule {}
