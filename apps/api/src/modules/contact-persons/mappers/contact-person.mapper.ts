import type {
  ActorRole,
  Availability,
} from '../../../generated/prisma/enums.js';
import type {
  ActorModel,
  ContactPersonModel,
} from '../../../generated/prisma/models.js';

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
  actor: Pick<ActorModel, 'uuid' | 'name' | 'role'>,
): ContactPersonActorResponse {
  return { uuid: actor.uuid, name: actor.name, role: actor.role };
}
