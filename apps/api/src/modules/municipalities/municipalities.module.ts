import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { MunicipalitiesController } from './municipalities.controller.js';
import { MunicipalitiesRepository } from './municipalities.repository.js';
import { MunicipalitiesService } from './municipalities.service.js';

@Module({
  controllers: [MunicipalitiesController],
  providers: [MunicipalitiesService, MunicipalitiesRepository, PrismaService],
})
export class MunicipalitiesModule {}
