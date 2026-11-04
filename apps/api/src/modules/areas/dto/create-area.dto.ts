import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
} from '../../../generated/prisma/enums.js';

/**
 * Area fields shared by create and update. Required fields per application
 * type are checked in the service, because they depend on the application.
 */
export class AreaFieldsDto {
  @ApiProperty({ example: 'Strandvej', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  roadName: string;

  @ApiProperty({ enum: RoadOwnership, enumName: 'RoadOwnership' })
  @IsEnum(RoadOwnership)
  roadOwnership: RoadOwnership;

  @ApiProperty({
    description: 'Danish postal code (4 digits).',
    example: '2900',
    pattern: '^\\d{4}$',
  })
  @Matches(/^\d{4}$/, { message: 'postalCode must be 4 digits' })
  postalCode: string;

  @ApiPropertyOptional({ example: '10', maxLength: 20, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumberFrom?: string | null;

  @ApiPropertyOptional({ example: '24', maxLength: 20, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumberTo?: string | null;

  @ApiPropertyOptional({
    description: 'Used instead of house numbers, e.g. "Ud for havnen".',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  alternativeDescription?: string | null;

  @ApiPropertyOptional({
    enum: RoadSection,
    enumName: 'RoadSection',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(RoadSection)
  roadSection?: RoadSection | null;

  @ApiPropertyOptional({
    description: 'Required when roadSection is Other.',
    maxLength: 200,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  roadSectionDescription?: string | null;

  @ApiPropertyOptional({ enum: RoadSide, enumName: 'RoadSide', nullable: true })
  @IsOptional()
  @IsEnum(RoadSide)
  roadSide?: RoadSide | null;

  @ApiPropertyOptional({
    enum: Direction,
    enumName: 'Direction',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction | null;

  @ApiPropertyOptional({
    example: 18,
    exclusiveMinimum: true,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  lengthInMeters?: number | null;

  @ApiPropertyOptional({
    example: 0.6,
    exclusiveMinimum: true,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  widthInMeters?: number | null;

  @ApiPropertyOptional({
    example: 1.2,
    exclusiveMinimum: true,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  depthInMeters?: number | null;
}

export class CreateAreaDto extends AreaFieldsDto {
  @ApiProperty({
    description: 'Case number of the application the area belongs to.',
    example: 'DEV-GRAVE-1',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;
}
