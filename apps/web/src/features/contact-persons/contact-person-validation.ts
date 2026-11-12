import type {
  ContactPerson,
  ContactPersonFormField,
  ContactPersonFormValues,
  ContactPersonInput,
} from '../../types/contact-person.types.js';
import { ApplicationType, type Status } from '../../types/prisma-enums.js';

// These rules mirror
// apps/api/src/modules/contact-persons/rules/contact-person-rules.ts, which
// enforces them again on the server.

export interface ContactPersonFieldSet {
  availability: boolean;
}

/**
 * Which fields the applicant fills in. Excavation permits choose an
 * availability (UC-031); road use applications always use Day, so the
 * system sets it (UC-031 A1) and it cannot be changed (UC-033 A1).
 */
export function getContactPersonFieldSet(
  type: ApplicationType,
): ContactPersonFieldSet {
  return type === ApplicationType.ExcavationPermit
    ? { availability: true }
    : { availability: false };
}

export function canEditContactPersons(status: Status): boolean {
  return status === 'Draft' || status === 'ChangeRequired';
}

export type ContactPersonFieldError = 'required' | 'phoneNumber' | 'email';

export type ContactPersonFieldErrors = Partial<
  Record<ContactPersonFormField, ContactPersonFieldError>
>;

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/** Matches text, an @, text, a dot and text, e.g. `navn@firma.dk`. */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phonePattern = /^\d{8}$/;

/** Finds missing or invalid fields (UC-031 F1 to F4, UC-033 F1 to F4). */
export function validateContactPerson(
  type: ApplicationType,
  values: ContactPersonFormValues,
): ContactPersonFieldErrors {
  const fieldSet = getContactPersonFieldSet(type);
  const errors: ContactPersonFieldErrors = {};

  if (!hasText(values.name)) errors.name = 'required';
  if (fieldSet.availability && !values.availability) {
    errors.availability = 'required';
  }
  if (!phonePattern.test(values.phoneNumber.trim())) {
    errors.phoneNumber = hasText(values.phoneNumber)
      ? 'phoneNumber'
      : 'required';
  }
  if (!emailPattern.test(values.email.trim())) {
    errors.email = hasText(values.email) ? 'email' : 'required';
  }

  return errors;
}

export const emptyContactPersonFormValues: ContactPersonFormValues = {
  name: '',
  availability: '',
  phoneNumber: '',
  email: '',
};

/** Prefills the form from a saved contact person (UC-033). */
export function toContactPersonFormValues(
  contactPerson: ContactPerson,
): ContactPersonFormValues {
  return {
    name: contactPerson.name,
    availability: contactPerson.availability,
    phoneNumber: contactPerson.phoneNumber,
    email: contactPerson.email,
  };
}

/**
 * Builds the request body. Availability is only sent when the application
 * type lets the applicant choose it; the server sets Day otherwise.
 */
export function toContactPersonInput(
  type: ApplicationType,
  values: ContactPersonFormValues,
): ContactPersonInput {
  const fieldSet = getContactPersonFieldSet(type);
  const input: ContactPersonInput = {
    name: values.name.trim(),
    phoneNumber: values.phoneNumber.trim(),
    email: values.email.trim(),
  };
  if (fieldSet.availability && values.availability) {
    input.availability = values.availability;
  }
  return input;
}
