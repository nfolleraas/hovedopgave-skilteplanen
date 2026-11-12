import {
  ApplicationType,
  Availability,
  Status,
} from '../../../generated/prisma/enums.js';

/** Contact person fields that can be checked against the application type. */
export interface ContactPersonRuleInput {
  name?: string | null;
  availability?: Availability | null;
  phoneNumber?: string | null;
  email?: string | null;
}

export type ContactPersonRuleField =
  | 'name'
  | 'availability'
  | 'phoneNumber'
  | 'email';

export interface ContactPersonFieldSet {
  availability: boolean;
}

/**
 * Which fields the applicant fills in. Excavation permits choose an
 * availability (UC-031 step 2); road use applications always use Day, so
 * the system sets it (UC-031 A1) and it cannot be changed (UC-033 A1).
 */
export function getContactPersonFieldSet(
  type: ApplicationType,
): ContactPersonFieldSet {
  return type === ApplicationType.ExcavationPermit
    ? { availability: true }
    : { availability: false };
}

/** Availability used when the applicant cannot choose one (UC-031 A1). */
export const defaultAvailability = Availability.Day;

const editableStatuses: readonly Status[] = [
  Status.Draft,
  Status.ChangeRequired,
];

export function canEditContactPersons(status: Status): boolean {
  return editableStatuses.includes(status);
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Matches text, an @, text, a dot and text, e.g. `navn@firma.dk`. */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phonePattern = /^\d{8}$/;

/**
 * Returns the fields that are missing or invalid for a complete contact
 * person (UC-031 F1 to F4, UC-033 F1 to F4).
 */
export function findInvalidContactPersonFields(
  type: ApplicationType,
  input: ContactPersonRuleInput,
): ContactPersonRuleField[] {
  const fields = getContactPersonFieldSet(type);
  const invalid: ContactPersonRuleField[] = [];

  if (!hasText(input.name)) invalid.push('name');
  if (fields.availability && !input.availability) invalid.push('availability');
  if (!phonePattern.test(input.phoneNumber ?? '')) invalid.push('phoneNumber');
  if (!emailPattern.test(input.email ?? '')) invalid.push('email');

  return invalid;
}
