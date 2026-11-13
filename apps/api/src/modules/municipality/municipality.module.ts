import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { MunicipalityController } from './municipality.controller.js';
import { MunicipalityRepository } from './municipality.repository.js';
import { MunicipalityService } from './municipality.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [MunicipalityController],
  providers: [MunicipalityRepository, MunicipalityService],
})
export class MunicipalityModule {}
