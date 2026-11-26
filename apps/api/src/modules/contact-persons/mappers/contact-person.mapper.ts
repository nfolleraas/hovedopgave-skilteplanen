import type {
  ActorRole,
  Availability,
} from '../../../generated/prisma/enums.js';
import type { ContactPersonModel } from '../../../generated/prisma/models.js';
import type { ContactPersonActor } from '../contact-persons.repository.js';

/** Contact person shape returned by the API. */
export interface ContactPersonResponse {
  uuid: string;
  applicationId: string;
  actorId: string;
  name: string;
  availability: Availability;
  phoneNumber: string;
  email: string;
}

/** The actor fields the contact persons page needs. */
export interface ContactPersonActorResponse {
  uuid: string;
  name: string;
  role: ActorRole;
  phoneNumber: string;
  email: string;
  cvrNumber: string | null;
  department: string | null;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}

export function toContactPersonResponse(
  contactPerson: ContactPersonModel,
): ContactPersonResponse {
  return {
    uuid: contactPerson.uuid,
    applicationId: contactPerson.applicationId,
    actorId: contactPerson.actorId,
    name: contactPerson.name,
    availability: contactPerson.availability,
    phoneNumber: contactPerson.phoneNumber,
    email: contactPerson.email,
  };
}

export function toContactPersonActorResponse(
  actor: ContactPersonActor,
): ContactPersonActorResponse {
  return {
    uuid: actor.uuid,
    name: actor.name,
    role: actor.role,
    phoneNumber: actor.phoneNumber,
    email: actor.email,
    cvrNumber: actor.cvrNumber,
    department: actor.department,
    address: { ...actor.address },
  };
}
