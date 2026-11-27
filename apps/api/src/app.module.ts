import { Module } from '@nestjs/common';
import { ActorsModule } from './modules/actors/actors.module.js';
import { AddressModule } from './modules/address/address.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { ContactPersonModule } from './modules/contact-person/contact-person.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MunicipalityModule } from './modules/municipality/municipality.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { RoadPermitModule } from './modules/road-permit/road-permit.module.js';

@Module({
  imports: [
    ActorsModule,
    AddressModule,
    ContactPersonModule,
    HealthModule,
    PrismaModule,
    ApplicationsModule,
    MunicipalityModule,
    RoadPermitModule,
  ],
})
export class AppModule {}
