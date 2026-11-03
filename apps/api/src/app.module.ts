import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { R2Module } from './modules/s3/r2.module.js';

@Module({
  imports: [PrismaModule, R2Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
