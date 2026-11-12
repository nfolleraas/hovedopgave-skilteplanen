import type { ApplicationType, Availability, Status } from './prisma-enums.js';

/** Contact person as returned by the contact persons API. */
export interface ContactPerson {
  uuid: string;
  applicationId: string;
  name: string;
  availability: Availability;
  phoneNumber: string;
  email: string;
}

export interface ContactPersonApplication {
  caseNumber: string;
  type: ApplicationType;
  status: Status;
}

export interface ApplicationContactPersons {
  application: ContactPersonApplication;
  contactPersons: ContactPerson[];
}

/** Fields sent when creating or updating a contact person. */
export type ContactPersonInput = Partial<
  Omit<ContactPerson, 'uuid' | 'applicationId'>
>;

/** Form values are kept as text so the user's input is never reformatted. */
export interface ContactPersonFormValues {
  name: string;
  availability: Availability | '';
  phoneNumber: string;
  email: string;
}

export type ContactPersonFormField = keyof ContactPersonFormValues;
