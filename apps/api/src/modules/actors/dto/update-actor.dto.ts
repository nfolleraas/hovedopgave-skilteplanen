import { Allow } from 'class-validator';
import { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import { UpdateContactPersonDto } from '../../contact-person/dto/update-contact-person.dto.js';

export class UpdateActorDto {
  @Allow()
  name?: string;

  @Allow()
  phoneNumber?: string;

  @Allow()
  email?: string;

  @Allow()
  cvrNumber?: string;

  @Allow()
  department?: string;

  @Allow()
  address?: CreateAddressDto;

  @Allow()
  contactPerson?: UpdateContactPersonDto;
}
