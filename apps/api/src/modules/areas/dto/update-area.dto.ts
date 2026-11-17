import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAreaDto } from './create-area.dto.js';

// The application an area belongs to and where its road came from cannot
// change.
export class UpdateAreaDto extends PartialType(
  OmitType(CreateAreaDto, ['applicationId', 'isManual'] as const),
) {}
