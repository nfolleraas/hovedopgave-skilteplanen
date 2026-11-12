import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Availability } from '../../../generated/prisma/enums.js';

/**
 * Contact person fields shared by create and update. Whether availability
 * can be chosen depends on the application type, so that is checked in the
 * service (UC-031 A1).
 */
export class ContactPersonFieldsDto {
  @ApiProperty({ example: 'Jens Jensen', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description:
      'Chosen for excavation permits. Road use applications always use Day, ' +
      'so the field is not sent for them (UC-031 A1).',
    enum: Availability,
    enumName: 'Availability',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(Availability)
  availability?: Availability | null;

  @ApiProperty({
    description: 'Danish phone number (8 digits).',
    example: '12345678',
    pattern: '^\\d{8}$',
  })
  @Matches(/^\d{8}$/, { message: 'phoneNumber must be 8 digits' })
  phoneNumber: string;

  @ApiProperty({ example: 'jens@example.com', maxLength: 254 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;
}

export class CreateContactPersonDto extends ContactPersonFieldsDto {
  @ApiProperty({
    description:
      'Case number of the application the contact person belongs to.',
    example: 'DEV-GRAVE-1',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;
}
