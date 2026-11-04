import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAreaDto } from './create-area.dto.js';

// The application an area belongs to cannot change.
export class UpdateAreaDto extends PartialType(
  OmitType(CreateAreaDto, ['applicationId'] as const),
) {}
