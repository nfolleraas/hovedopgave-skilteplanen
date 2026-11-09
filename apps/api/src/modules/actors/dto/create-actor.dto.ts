import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ActorRole } from '../../../generated/prisma/enums.js';
import { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import { CreateContactPersonDto } from '../../contact-person/dto/create-contact-person.dto.js';

const namePattern = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;
const eightDigitPattern = /^\d{8}$/;

export class CreateActorDto {
  @IsString()
  @IsNotEmpty()
  applicationCaseNumber!: string;

  @IsEnum(ActorRole)
  role!: ActorRole;

  @Matches(namePattern)
  name!: string;

  @Matches(eightDigitPattern)
  phoneNumber!: string;

  @IsEmail()
  email!: string;

  @ValidateIf((dto: CreateActorDto) => dto.role !== ActorRole.Private)
  @Matches(eightDigitPattern)
  cvrNumber?: string;

  @ValidateIf((dto: CreateActorDto) => dto.role !== ActorRole.Private)
  @IsString()
  @IsNotEmpty()
  department?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address!: CreateAddressDto;

  @ValidateIf((dto: CreateActorDto) => dto.role !== ActorRole.Private)
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateContactPersonDto)
  contactPerson?: CreateContactPersonDto;
}
