import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ActorRole } from '../../../generated/prisma/enums.js';
import { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import { CreateContactPersonDto } from '../../contact-person/dto/create-contact-person.dto.js';

export class CreateActorDto {
  @IsString()
  @Matches(/\S/)
  applicationCaseNumber!: string;

  @IsEnum(ActorRole)
  role!: ActorRole;

  @IsString()
  @Matches(/\S/)
  name!: string;

  @Matches(/^\d{8}$/)
  phoneNumber!: string;

  @IsEmail()
  email!: string;

  @ValidateIf(
    (dto: CreateActorDto, value: unknown) =>
      dto.role !== ActorRole.Private || value !== undefined,
  )
  @Matches(/^\d{8}$/)
  cvrNumber?: string;

  @ValidateIf(
    (dto: CreateActorDto, value: unknown) =>
      dto.role !== ActorRole.Private || value !== undefined,
  )
  @IsString()
  @Matches(/\S/)
  department?: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address!: CreateAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContactPersonDto)
  contactPerson?: CreateContactPersonDto;
}
