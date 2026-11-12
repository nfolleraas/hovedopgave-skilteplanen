import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateContactPersonDto } from './create-contact-person.dto.js';

// The application a contact person belongs to cannot change.
export class UpdateContactPersonDto extends PartialType(
  OmitType(CreateContactPersonDto, ['applicationId'] as const),
) {}
