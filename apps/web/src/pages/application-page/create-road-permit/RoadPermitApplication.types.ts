import type {
  CompanyInformation,
  ContactInformation,
  MaterialDraft,
  MaterialEntry,
  RoadMarkingDetails,
  UsageDetails,
} from './formTypes';

export type RoadPermitApplication = {
  title: string;
  municipalityName: string | null;
  materials: MaterialEntry[];
  usageDetails: UsageDetails;
  contactInformation: ContactInformation;
  documentPlaceholder: {
    name: string;
    DocumentType: string;
    Doc_URL: string;
    DateForUpload: string;
  };
  roadMarking: RoadMarkingDetails;
  applicant: CompanyInformation;
  confirmed: boolean;
};

export type RoadPermitDraft = Pick<
  RoadPermitApplication,
  | 'title'
  | 'municipalityName'
  | 'materials'
  | 'usageDetails'
  | 'contactInformation'
  | 'roadMarking'
> & { materialDraft: MaterialDraft };
