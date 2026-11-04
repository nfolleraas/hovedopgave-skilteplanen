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
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AreaFieldsDto)
  areas: AreaFieldsDto[];
}
