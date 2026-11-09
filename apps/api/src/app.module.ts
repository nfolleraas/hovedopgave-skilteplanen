import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { ApplicantsModule } from './modules/applicants/applicants.module.js';
import { PrismaService } from './prisma.service.js';

@Module({
  imports: [AddressesModule, ApplicantsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
