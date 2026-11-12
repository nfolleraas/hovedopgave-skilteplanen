import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  type SupportedApplicationType,
  supportedApplicationTypes,
} from '../../../common/application-types.js';

export class CreateDevApplicationDto {
  @ApiProperty({ enum: supportedApplicationTypes, enumName: 'ApplicationType' })
  @IsIn(supportedApplicationTypes)
  type: SupportedApplicationType;
}
