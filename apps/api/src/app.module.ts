import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ActorsModule } from './modules/actors/actors.module.js';
import { AddressModule } from './modules/address/address.module.js';
import { ContactPersonModule } from './modules/contact-person/contact-person.module.js';

@Module({
  imports: [ActorsModule, AddressModule, ContactPersonModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
