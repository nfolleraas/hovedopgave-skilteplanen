import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../generated/prisma/client.js';

export class CreateDocumentDto {
  @ApiProperty()
  name: string;

  @ApiProperty({
    enum: DocumentType,
    default: DocumentType.Other,
    required: true,
  })
  documentType: DocumentType = DocumentType.Other;

  @ApiProperty()
  applicationId: string;
}
