import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { ActorsModule } from './modules/actors/actors.module.js';

@Module({
  imports: [ActorsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
