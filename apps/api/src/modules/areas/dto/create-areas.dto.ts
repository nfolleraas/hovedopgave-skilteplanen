import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AreaFieldsDto } from './create-area.dto.js';

/** Creates one area per selected road in a single request. */
export class CreateAreasDto {
  @ApiProperty({
    description: 'Case number of the application the areas belong to.',
    example: 'DEV-GRAVE-1',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ minItems: 1, type: () => [AreaFieldsDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AreaFieldsDto)
  areas: AreaFieldsDto[];
}
