import type { CreateRoadPermitDto } from './create-road-permit.dto.js';

export class UpdateRoadPermitDto {
  title?: string;
  municipalityName?: string | null;
  materials?: CreateRoadPermitDto['materials'];
  usageDetails?: Partial<CreateRoadPermitDto['usageDetails']>;
  roadMarking?: Partial<CreateRoadPermitDto['roadMarking']>;
  materialDraft?: Partial<{
    editingId: string | null;
    type: string;
    quantity: string;
    notes: string;
  }>;
}
