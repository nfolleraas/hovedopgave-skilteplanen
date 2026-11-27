import { Module } from '@nestjs/common';
import { ContactPersonsModule } from './modules/contact-persons/contact-persons.module.js';
import { DevApplicationsModule } from './modules/dev-applications/dev-applications.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MunicipalityModule } from './modules/municipality/municipality.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { RoadPermitModule } from './modules/road-permit/road-permit.module.js';

@Module({
  imports: [
    HealthModule,
    PrismaModule,
    ContactPersonsModule,
    MunicipalityModule,
    RoadPermitModule,
    // Test-only endpoints for listing and creating applications.
    ...(process.env.NODE_ENV === 'production' ? [] : [DevApplicationsModule]),
  ],
})
export class AppModule {}
