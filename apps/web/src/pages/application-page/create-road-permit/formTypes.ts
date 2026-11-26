import type { RoadLocation } from '../../../utils/validateRoadLocation';

export type UsageDetails = RoadLocation & {
  usage: string;
  startDate: string;
  endDate: string;
  locationDescription: string;
};

export type ContactInformation = {
  name: string;
  phone: string;
  email: string;
};

export type SubmissionStatus = 'idle' | 'sending' | 'success' | 'error';

export type MaterialEntry = {
  id: string;
  type: string;
  quantity: number;
  notes: string;
};

export type MaterialDraft = {
  type: string;
  quantity: string;
  notes: string;
  editingId: string | null;
};

export const emptyMaterialDraft: MaterialDraft = {
  type: '',
  quantity: '1',
  notes: '',
  editingId: null,
};

export type ApplicationDocument = {
  id: string;
  file: File;
};

export type CompanyInformation = {
  name: string;
  department: string;
  address1: string;
  address2: string;
  postalCode: string;
  city: string;
  contactPerson: string;
  directPhone: string;
  mobile: string;
  email: string;
  companyPhone: string;
  cvr: string;
};

export const emptyCompanyInformation: CompanyInformation = {
  name: '',
  department: '',
  address1: '',
  address2: '',
  postalCode: '',
  city: '',
  contactPerson: '',
  directPhone: '',
  mobile: '',
  email: '',
  companyPhone: '',
  cvr: '',
};

export type SubmissionDetails = {
  applicant: CompanyInformation;
  usesSupplier: boolean;
  supplier: CompanyInformation;
  confirmed: boolean;
};

export type TrafficMeasuresDetails = {
  type: string;
  protectionLevel: string;
  scope: string;
  description: string;
};

export type RoadMarkingDetails = {
  trafficChanges: string[];
  accessWays: string;
  trafficPrecautions: TrafficMeasuresDetails[];
};
