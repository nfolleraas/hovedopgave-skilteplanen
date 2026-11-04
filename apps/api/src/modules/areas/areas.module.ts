import { Module } from '@nestjs/common';
import { AreasService } from './areas.service.js';
import { AreasController } from './areas.controller.js';

@Module({
  controllers: [AreasController],
  providers: [AreasService],
})
export class AreasModule {}
