export class CreateRoadPermitDto {
  title: string;
  municipalityName: string | null;
  materials: {
    id: string;
    type: string;
    quantity: number;
    notes: string;
  }[];
  usageDetails: {
    usage: string;
    startDate: string;
    endDate: string;
    road: string;
    houseNumberFrom: string;
    houseNumberTo: string;
    postalCode: string;
    city: string;
    locationDescription: string;
  };
  contactInformation: {
    name: string;
    phone: string;
    email: string;
  };
  documentPlaceholder: {
    name: string;
    DocumentType: string;
    Doc_URL: string;
    DateForUpload: string;
  };
  roadMarking: {
    trafficChanges: string[];
    accessWays: string;
    trafficPrecautions: {
      type: string;
      protectionLevel: string;
      scope: string;
      description: string;
    }[];
  };
  applicant: {
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
  confirmed: boolean;
}
