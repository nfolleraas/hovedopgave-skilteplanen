import { ApiProperty } from '@nestjs/swagger';
import {
  DocumentType,
  SignPlanType,
} from '../../../generated/prisma/client.js';

export class CreateSignPlanDto {
  @ApiProperty()
  name: string;

  @ApiProperty({
    enum: DocumentType,
    default: DocumentType.SignPlan,
  })
  documentType: DocumentType = DocumentType.SignPlan;

  @ApiProperty({ enum: SignPlanType })
  signPlanType: SignPlanType;

  @ApiProperty({ nullable: true, required: false })
  group: string;

  @ApiProperty({ nullable: true, required: false })
  plan: string;

  @ApiProperty()
  applicationId: string;
}
