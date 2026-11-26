import { Module } from '@nestjs/common';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MunicipalitiesModule } from './modules/municipalities/municipalities.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { RoadPermitModule } from './modules/road-permit/road-permit.module.js';

@Module({
  imports: [
    AddressesModule,
    HealthModule,
    MunicipalitiesModule,
    PrismaModule,
    RoadPermitModule,
  ],
})
export class AppModule {}
