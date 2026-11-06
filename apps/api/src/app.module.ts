import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';

@Module({
  imports: [AddressesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
