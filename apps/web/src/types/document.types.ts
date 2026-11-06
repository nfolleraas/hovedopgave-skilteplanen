export type DocumentType = 'SignPlan' | 'Other';

export type Document = {
  uuid: string;
  name: string;
  documentType: DocumentType;
  url: string;
  date: string;
  applicationId: string;
};

export type CreateDocument = {
  name: string;
  documentType: DocumentType;
  url: string;
  applicationId: string;
};
