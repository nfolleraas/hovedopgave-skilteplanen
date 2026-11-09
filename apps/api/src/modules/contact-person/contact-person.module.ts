import { Module } from '@nestjs/common';
import { ContactPersonService } from './contact-person.service.js';
import { ContactPersonController } from './contact-person.controller.js';

@Module({
  controllers: [ContactPersonController],
  providers: [ContactPersonService],
})
export class ContactPersonModule {}
