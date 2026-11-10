import { ActorRole } from '../../../generated/prisma/enums.js';
import { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import { CreateContactPersonDto } from '../../contact-person/dto/create-contact-person.dto.js';

export class CreateActorDto {
  applicationCaseNumber!: string;

  role!: ActorRole;

  name!: string;

  phoneNumber!: string;

  email!: string;

  cvrNumber?: string;

  department?: string;

  address!: CreateAddressDto;

  contactPerson?: CreateContactPersonDto;
}
