import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Query for listing the areas of one application. */
export class FindAreasQueryDto {
  @ApiProperty({
    description: 'Case number of the application the areas belong to.',
    example: '3f2b8c1e-9d4a-4b7e-8a61-2c5d0e9f7a13',
    format: 'uuid',
  })
  @IsUUID()
  applicationId: string;
}
