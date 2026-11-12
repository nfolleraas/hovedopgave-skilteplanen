import type { Availability } from '../../../generated/prisma/enums.js';
import type { ContactPersonModel } from '../../../generated/prisma/models.js';

/** Contact person shape returned by the API. */
export interface ContactPersonResponse {
  uuid: string;
  applicationId: string;
  name: string;
  availability: Availability;
  phoneNumber: string;
  email: string;
}

export function toContactPersonResponse(
  contactPerson: ContactPersonModel,
): ContactPersonResponse {
  return {
    uuid: contactPerson.uuid,
    applicationId: contactPerson.applicationId,
    name: contactPerson.name,
    availability: contactPerson.availability,
    phoneNumber: contactPerson.phoneNumber,
    email: contactPerson.email,
  };
}
