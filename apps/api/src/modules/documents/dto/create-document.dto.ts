import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../generated/prisma/client.js';

export class CreateDocumentDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty()
  url: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  signPlanId: string;
}
