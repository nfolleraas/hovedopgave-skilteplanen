import { Module } from '@nestjs/common';
import { MunicipalitiesController } from './municipalities.controller.js';
import { MunicipalitiesRepository } from './municipalities.repository.js';
import { MunicipalitiesService } from './municipalities.service.js';

@Module({
  controllers: [MunicipalitiesController],
  providers: [MunicipalitiesService, MunicipalitiesRepository],
})
export class MunicipalitiesModule {}
