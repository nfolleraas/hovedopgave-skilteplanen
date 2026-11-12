import { PartialType } from '@nestjs/swagger';
import { CreateRoadPermitDto } from './create-road-permit.dto.js';

export class UpdateRoadPermitDto extends PartialType(CreateRoadPermitDto) {}
