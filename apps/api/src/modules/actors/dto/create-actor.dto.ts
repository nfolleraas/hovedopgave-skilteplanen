import { Type } from 'class-transformer';
import { Allow, IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { ActorRole } from '../../../generated/prisma/enums.js';
import { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import { CreateContactPersonDto } from '../../contact-person/dto/create-contact-person.dto.js';

export class CreateActorDto {
  @Allow()
  applicationCaseNumber!: string;

  @Allow()
  role!: ActorRole;

  @Allow()
  name!: string;

  @Allow()
  phoneNumber!: string;

  @Allow()
  email!: string;

  @Allow()
  cvrNumber?: string;

  @Allow()
  department?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address!: CreateAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactPersonDto)
  contactPerson?: CreateContactPersonDto;
}
