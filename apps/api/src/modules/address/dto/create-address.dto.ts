import { IsString, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @Matches(/\S/)
  street!: string;

  @IsString()
  @Matches(/\S/)
  houseNumber!: string;

  @IsString()
  @Matches(/\S/)
  postalCode!: string;

  @IsString()
  @Matches(/\S/)
  city!: string;
}
