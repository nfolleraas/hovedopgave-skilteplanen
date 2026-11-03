import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../../generated/prisma/client.js';

export class UpdateDocumentDto {
  @ApiProperty()
  name?: string;

  @ApiProperty({ enum: DocumentType })
  documentType?: DocumentType;

  @ApiProperty()
  url?: string;
}
