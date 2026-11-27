import type {
  Area,
  AreaFormField,
  AreaFormValues,
  AreaInput,
} from '../../types/area.types.js';
import {
  ApplicationType,
  RoadSection,
  type Status,
} from '../../types/prisma-enums.js';

// These rules mirror apps/api/src/modules/areas/rules/area-rules.ts, which
// enforces them again on the server.

export interface AreaFieldSet {
  direction: boolean;
  depth: boolean;
}

/**
 * Finds the detail fields an application type uses. Excavation permits use
 * all of them (UC-034); road use permits have no direction or depth
 * (UC-034 A1).
 * @param type - The application type
 * @returns Whether direction and depth are used
 */
export function getAreaFieldSet(type: ApplicationType): AreaFieldSet {
  return type === ApplicationType.ExcavationPermit
    ? { direction: true, depth: true }
    : { direction: false, depth: false };
}

/**
 * Checks whether areas may be changed for an application status.
 * @param status - The status of the application
 * @returns True for drafts and applications that require changes
 */
export function canEditAreas(status: Status): boolean {
  return status === 'Draft' || status === 'ChangeRequired';
}

/**
 * Checks whether an area may be deleted. The last area on an application
 * cannot be deleted (UC-035 F1).
 * @param areaCount - The number of areas on the application
 * @returns True if there is more than one area
 */
export function canDeleteArea(areaCount: number): boolean {
  return areaCount > 1;
}

export type AreaFieldError =
  | 'required'
  | 'positiveNumber'
  | 'postalCode'
  | 'houseNumberOrDescription';

export type AreaFieldErrors = Partial<Record<AreaFormField, AreaFieldError>>;

/**
 * Errors about the format of a value, which are shown as soon as the user
 * leaves the field. Missing values are only shown when the user saves.
 */
export const formatErrors: readonly AreaFieldError[] = [
  'positiveNumber',
  'postalCode',
];

/**
 * Maximum text lengths. They mirror the `@MaxLength` limits in
 * apps/api/src/modules/areas/dto/create-area.dto.ts, so the form stops the
 * user before the API would reject the request.
 */
export const areaTextMaxLengths = {
  roadName: 200,
  houseNumberFrom: 20,
  houseNumberTo: 20,
  alternativeDescription: 500,
  roadSectionDescription: 200,
} as const satisfies Partial<Record<AreaFormField, number>>;

// Danish number format: a comma is the decimal mark and a point separates
// thousands, e.g. `0,6`, `1000` or `1.000,5`. A point is not a decimal mark,
// so `1.5` is rejected instead of being read as 15 or 1.5.
const danishNumberPattern = /^(\d+|\d{1,3}(\.\d{3})+)(,\d+)?$/;

/**
 * Parses a number typed in Danish format, e.g. `1.000,5`.
 * @param value - The typed text
 * @returns The number, or undefined if the text is not a valid number
 */
export function parseDecimal(value: string): number | undefined {
  const trimmed = value.trim();
  if (!danishNumberPattern.test(trimmed)) {
    return undefined;
  }
  return Number(trimmed.replaceAll('.', '').replace(',', '.'));
}

/**
 * Calculates the area as length × width.
 * @param lengthInMeters - The typed length in meters
 * @param widthInMeters - The typed width in meters
 * @returns The area in m², or undefined until both values are valid
 */
export function calculateAreaInSquareMeters(
  lengthInMeters: string,
  widthInMeters: string,
): number | undefined {
  const length = parseDecimal(lengthInMeters);
  const width = parseDecimal(widthInMeters);
  if (length === undefined || width === undefined) {
    return undefined;
  }
  return length * width;
}

/**
 * Formats an area with one decimal and a Danish decimal comma, e.g. `10,8`.
 * @param value - The area in m²
 * @returns The formatted number
 */
export function formatSquareMeters(value: number): string {
  return value.toLocaleString('da-DK', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/**
 * Checks whether a value contains non-whitespace text.
 * @param value - The value to check
 * @returns True if the value is not blank
 */
function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Adds an error when a measurement is missing or not a positive number.
 * @param errors - The errors to add to
 * @param field - The field to check
 * @param value - The typed value
 */
function checkPositive(
  errors: AreaFieldErrors,
  field: AreaFormField,
  value: string,
): void {
  if (!hasText(value)) {
    errors[field] = 'required';
    return;
  }
  const parsed = parseDecimal(value);
  if (parsed === undefined || parsed <= 0) {
    errors[field] = 'positiveNumber';
  }
}

/**
 * Finds missing or invalid fields. Road name and postal code are only
 * checked for areas that were entered manually (UC-034 A3). The road status
 * is checked for every area, because the applicant always chooses it.
 * @param type - The application type, which decides the required fields
 * @param values - The form values
 * @param options - Whether to check the road name and postal code
 * @returns The errors keyed by field
 */
export function validateArea(
  type: ApplicationType,
  values: AreaFormValues,
  options: { includeRoad: boolean },
): AreaFieldErrors {
  const errors: AreaFieldErrors = {};

  if (options.includeRoad) {
    if (!hasText(values.roadName)) errors.roadName = 'required';
    if (!/^\d{4}$/.test(values.postalCode.trim())) {
      errors.postalCode = hasText(values.postalCode)
        ? 'postalCode'
        : 'required';
    }
  }

  if (!values.roadOwnership) errors.roadOwnership = 'required';

  const fieldSet = getAreaFieldSet(type);

  // Either both house numbers or an alternative description (UC-034 F1).
  const hasFrom = hasText(values.houseNumberFrom);
  const hasTo = hasText(values.houseNumberTo);
  if (!hasText(values.alternativeDescription) && !(hasFrom && hasTo)) {
    if (!hasFrom) errors.houseNumberFrom = 'houseNumberOrDescription';
    if (!hasTo) errors.houseNumberTo = 'houseNumberOrDescription';
    if (!hasFrom && !hasTo) {
      errors.alternativeDescription = 'houseNumberOrDescription';
    }
  }

  if (!values.roadSection) {
    errors.roadSection = 'required';
  } else if (
    values.roadSection === RoadSection.Other &&
    !hasText(values.roadSectionDescription)
  ) {
    errors.roadSectionDescription = 'required';
  }
  if (!values.roadSide) errors.roadSide = 'required';
  if (fieldSet.direction && !values.direction) errors.direction = 'required';
  checkPositive(errors, 'lengthInMeters', values.lengthInMeters);
  checkPositive(errors, 'widthInMeters', values.widthInMeters);
  if (fieldSet.depth) {
    checkPositive(errors, 'depthInMeters', values.depthInMeters);
  }

  return errors;
}

export const emptyAreaFormValues: AreaFormValues = {
  roadName: '',
  roadOwnership: '',
  postalCode: '',
  houseNumberFrom: '',
  houseNumberTo: '',
  alternativeDescription: '',
  roadSection: '',
  roadSectionDescription: '',
  roadSide: '',
  direction: '',
  lengthInMeters: '',
  widthInMeters: '',
  depthInMeters: '',
};

/**
 * Shows a saved number in the same format the user types it, e.g. `0,6`.
 * @param value - The saved number
 * @returns The number with a decimal comma, or an empty string for null
 */
function formatNumber(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

/**
 * Prefills the form from a saved area (UC-036).
 * @param area - The saved area
 * @returns The form values
 */
export function toAreaFormValues(area: Area): AreaFormValues {
  return {
    roadName: area.roadName,
    roadOwnership: area.roadOwnership ?? '',
    postalCode: area.postalCode,
    houseNumberFrom: area.houseNumberFrom ?? '',
    houseNumberTo: area.houseNumberTo ?? '',
    alternativeDescription: area.alternativeDescription ?? '',
    roadSection: area.roadSection ?? '',
    roadSectionDescription: area.roadSectionDescription ?? '',
    roadSide: area.roadSide ?? '',
    direction: area.direction ?? '',
    lengthInMeters: formatNumber(area.lengthInMeters),
    widthInMeters: formatNumber(area.widthInMeters),
    depthInMeters: formatNumber(area.depthInMeters),
  };
}

/**
 * Trims a text and turns a blank text into null.
 * @param value - The typed text
 * @returns The trimmed text, or null if it is blank
 */
function textOrNull(value: string): string | null {
  return hasText(value) ? value.trim() : null;
}

/**
 * Builds the request body. Only sends fields the application type uses, and
 * road name and postal code only for manually entered roads.
 * @param type - The application type
 * @param values - The form values
 * @param options - Whether to send the road name and postal code
 * @returns The area input for the API
 */
export function toAreaInput(
  type: ApplicationType,
  values: AreaFormValues,
  options: { includeRoad: boolean },
): AreaInput {
  const input: AreaInput = {};

  if (options.includeRoad) {
    input.roadName = values.roadName.trim();
    input.postalCode = values.postalCode.trim();
  }
  if (values.roadOwnership) input.roadOwnership = values.roadOwnership;

  const fieldSet = getAreaFieldSet(type);
  input.houseNumberFrom = textOrNull(values.houseNumberFrom);
  input.houseNumberTo = textOrNull(values.houseNumberTo);
  input.alternativeDescription = textOrNull(values.alternativeDescription);
  input.roadSection = values.roadSection || null;
  input.roadSectionDescription =
    values.roadSection === RoadSection.Other
      ? textOrNull(values.roadSectionDescription)
      : null;
  input.roadSide = values.roadSide || null;
  input.lengthInMeters = parseDecimal(values.lengthInMeters) ?? null;
  input.widthInMeters = parseDecimal(values.widthInMeters) ?? null;
  if (fieldSet.direction) input.direction = values.direction || null;
  if (fieldSet.depth) {
    input.depthInMeters = parseDecimal(values.depthInMeters) ?? null;
  }

  return input;
}
