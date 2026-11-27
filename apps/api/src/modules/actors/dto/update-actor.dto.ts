import { Type } from 'class-transformer';
import {
  Allow,
  IsEmail,
  IsObject,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import { UpdateContactPersonDto } from '../../contact-person/dto/update-contact-person.dto.js';

export class UpdateActorDto {
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  name?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Matches(/^\d{8}$/)
  phoneNumber?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsEmail()
  email?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Matches(/^\d{8}$/)
  cvrNumber?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  department?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;

  @Allow()
  contactPerson?: UpdateContactPersonDto;
}
