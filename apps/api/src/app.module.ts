import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MunicipalityModule } from './modules/municipality/municipality.module.js';
import { RoadPermitModule } from './modules/road-permit/road-permit.module.js';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [MunicipalityModule, RoadPermitModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
