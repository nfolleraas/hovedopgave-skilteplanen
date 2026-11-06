import { ApiProperty } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiProperty()
  name?: string;

  @ApiProperty()
  url?: string;
}
