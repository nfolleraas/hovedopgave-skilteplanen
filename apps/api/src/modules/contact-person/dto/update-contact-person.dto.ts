import { PartialType } from '@nestjs/swagger';
import { CreateContactPersonDto } from './create-contact-person.dto.js';

export class UpdateContactPersonDto extends PartialType(CreateContactPersonDto) {}
