import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { MunicipalityModule } from './modules/municipality/municipality.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { RoadPermitModule } from './modules/road-permit/road-permit.module.js';

@Module({
  imports: [HealthModule, PrismaModule, MunicipalityModule, RoadPermitModule],
})
export class AppModule {}
