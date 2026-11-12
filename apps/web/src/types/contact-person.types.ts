import type {
  ActorRole,
  ApplicationType,
  Availability,
  Status,
} from './prisma-enums.js';

/** Contact person as returned by the contact persons API. */
export interface ContactPerson {
  uuid: string;
  applicationId: string;
  /** The actor the contact person belongs to. An actor can have several. */
  actorId: string;
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

/** An actor on the application, as the contact persons API returns it. */
export interface ContactPersonActor {
  uuid: string;
  name: string;
  role: ActorRole;
}

export interface ApplicationContactPersons {
  application: ContactPersonApplication;
  actors: ContactPersonActor[];
  contactPersons: ContactPerson[];
}

/** Fields sent when creating or updating a contact person. */
export type ContactPersonInput = Partial<
  Omit<ContactPerson, 'uuid' | 'applicationId' | 'actorId'>
>;

/** Form values are kept as text so the user's input is never reformatted. */
export interface ContactPersonFormValues {
  name: string;
  availability: Availability | '';
  phoneNumber: string;
  email: string;
}

export type ContactPersonFormField = keyof ContactPersonFormValues;
