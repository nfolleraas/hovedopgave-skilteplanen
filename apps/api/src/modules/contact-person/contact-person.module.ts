import { Module } from '@nestjs/common';
import { ContactPersonController } from './contact-person.controller.js';
import { ContactPersonService } from './contact-person.service.js';

@Module({
  controllers: [ContactPersonController],
  providers: [ContactPersonService],
})
export class ContactPersonModule {}
