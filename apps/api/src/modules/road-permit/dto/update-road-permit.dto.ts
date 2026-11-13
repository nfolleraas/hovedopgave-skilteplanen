import { CreateRoadPermitDto } from './create-road-permit.dto.js';

export class UpdateRoadPermitDto {
  title: string;
  municipalityName: string | null;
  materials: CreateRoadPermitDto['materials'];
  usageDetails: CreateRoadPermitDto['usageDetails'];
  contactInformation: CreateRoadPermitDto['contactInformation'];
  roadMarking: CreateRoadPermitDto['roadMarking'];
  materialDraft: {
    editingId?: string;
    type: string;
    quantity: string;
    notes: string;
  };
}
