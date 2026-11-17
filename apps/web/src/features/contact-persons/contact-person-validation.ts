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

/**
 * The last contact person on an application cannot be deleted
 * (UC-032 F1). The API checks this again.
 */
export function canDeleteContactPerson(savedCount: number): boolean {
  return savedCount > 1;
}

export type ContactPersonFieldError = 'required' | 'phoneNumber' | 'email';

export type ContactPersonFieldErrors = Partial<
  Record<ContactPersonFormField, ContactPersonFieldError>
>;

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Text, an @ and a domain with at least one dot, e.g. `navn@firma.dk`. The
 * domain cannot have empty parts, so `navn@firma..dk` and `navn@firma.dk.`
 * are rejected.
 */
const emailPattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

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

/**
 * Keeps only the digits of a typed or pasted phone number, so
 * `22 33 44 55` and `22-33-44-55` become `22334455`. A Danish country code
 * in front (`+45` or `0045`) is removed. Other input is left for the
 * validation to reject, so nothing is cut off silently.
 */
export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const hasCountryCode = /^\s*(\+|00)45/.test(raw);
  return hasCountryCode ? digits.replace(/^(00)?45/, '') : digits;
}

/** Spaces are never valid in an email address, so they are removed. */
export function normalizeEmailInput(raw: string): string {
  return raw.replace(/\s/g, '');
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
