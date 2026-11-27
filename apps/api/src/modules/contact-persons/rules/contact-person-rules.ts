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

/**
 * An application must keep at least one contact person, so the last one
 * cannot be deleted (UC-032 F1, UC-004 F7).
 */
export function canDeleteContactPerson(contactPersonCount: number): boolean {
  return contactPersonCount > 1;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * An address like `navn@firma.dk`, using only English letters, digits and
 * the characters an email needs:
 * - Before the @: letters, digits, `.`, `_`, `+` and `-`. Dots cannot be
 *   first, last or next to each other.
 * - After the @: parts of letters, digits and `-` separated by dots. A part
 *   cannot start or end with `-`, and the last part is at least two letters.
 * So commas, spaces, `æøå` and other special characters are rejected. The
 * web app uses the same pattern.
 */
const emailPattern =
  /^[A-Za-z0-9_+-]+(\.[A-Za-z0-9_+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/**
 * Removes spaces around the name and email, so `" Jens "` is saved as
 * `"Jens"` and a name of only spaces counts as missing. Fields that are not
 * in the input stay out of the result.
 */
export function trimContactPersonText<T extends ContactPersonRuleInput>(
  input: T,
): T {
  const result = { ...input };
  if (typeof result.name === 'string') result.name = result.name.trim();
  if (typeof result.email === 'string') result.email = result.email.trim();
  return result;
}

/**
 * A name of letters, spaces, hyphens and apostrophes, like `Anne-Marie
 * O'Brien` or `Søren Ærø`. It starts with a letter, so digits and other
 * special characters are rejected. The web app uses the same pattern.
 */
const namePattern = /^\p{L}[\p{L}\p{M}' -]*$/u;

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

  if (!hasText(input.name) || !namePattern.test(input.name?.trim() ?? '')) {
    invalid.push('name');
  }
  if (fields.availability && !input.availability) invalid.push('availability');
  if (!phonePattern.test(input.phoneNumber ?? '')) invalid.push('phoneNumber');
  if (!emailPattern.test(input.email ?? '')) invalid.push('email');

  return invalid;
}
