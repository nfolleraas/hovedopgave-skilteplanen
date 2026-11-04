import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { AreasModule } from './modules/areas/areas.module.js';

@Module({
  imports: [AreasModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
