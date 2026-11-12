import type {
  CompanyInformation,
  ContactInformation,
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
