import { Module } from '@nestjs/common';
import { ContactPersonsController } from './contact-persons.controller.js';
import { ContactPersonsRepository } from './contact-persons.repository.js';
import { ContactPersonsService } from './contact-persons.service.js';

@Module({
  controllers: [ContactPersonsController],
  providers: [ContactPersonsRepository, ContactPersonsService],
})
export class ContactPersonsModule {}
