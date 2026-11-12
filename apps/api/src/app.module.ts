import { Module } from '@nestjs/common';
import { ContactPersonsModule } from './modules/contact-persons/contact-persons.module.js';
import { DevApplicationsModule } from './modules/dev-applications/dev-applications.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';

@Module({
  imports: [
    HealthModule,
    PrismaModule,
    ContactPersonsModule,
    // Test-only endpoints for listing and creating applications.
    ...(process.env.NODE_ENV === 'production' ? [] : [DevApplicationsModule]),
  ],
})
export class AppModule {}
