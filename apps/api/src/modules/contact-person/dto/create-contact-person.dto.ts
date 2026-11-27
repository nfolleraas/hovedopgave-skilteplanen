import { IsEmail, IsEnum, IsOptional, Matches } from 'class-validator';
import { Availability } from '../../../generated/prisma/enums.js';

const personNamePattern = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;
const phonePattern = /^\d{8}$/;

export class CreateContactPersonDto {
  @Matches(personNamePattern)
  name!: string;

  @IsEmail()
  email!: string;

  @Matches(phonePattern)
  phoneNumber!: string;

  @IsOptional()
  @IsEnum(Availability)
  availability?: Availability;
}
