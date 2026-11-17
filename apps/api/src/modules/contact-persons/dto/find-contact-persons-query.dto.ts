import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Query for listing the contact persons on an application. */
export class FindContactPersonsQueryDto {
  @ApiProperty({
    description: 'Case number of the application to list contact persons for.',
    example: 'DEV-GRAVE-1',
  })
  @IsString()
  @IsNotEmpty()
  applicationId: string;
}
