import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApplicationType } from '../../../generated/prisma/enums.js';

export class CreateDevApplicationDto {
  @ApiProperty({ enum: ApplicationType, enumName: 'ApplicationType' })
  @IsEnum(ApplicationType)
  type: ApplicationType;
}
