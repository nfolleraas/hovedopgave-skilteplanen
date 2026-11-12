import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { RoadPermitModule } from './modules/road-permit/road-permit.module.js';

@Module({
  imports: [RoadPermitModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
