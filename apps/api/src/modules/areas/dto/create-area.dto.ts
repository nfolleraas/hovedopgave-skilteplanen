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
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  roadName: string;

  @IsEnum(RoadOwnership)
  roadOwnership: RoadOwnership;

  @Matches(/^\d{4}$/, { message: 'postalCode must be 4 digits' })
  postalCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumberFrom?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  houseNumberTo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  alternativeDescription?: string | null;

  @IsOptional()
  @IsEnum(RoadSection)
  roadSection?: RoadSection | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  roadSectionDescription?: string | null;

  @IsOptional()
  @IsEnum(RoadSide)
  roadSide?: RoadSide | null;

  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  lengthInMeters?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  widthInMeters?: number | null;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  depthInMeters?: number | null;
}

export class CreateAreaDto extends AreaFieldsDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;
}
