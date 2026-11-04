import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AreasModule } from './modules/areas/areas.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, AreasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
