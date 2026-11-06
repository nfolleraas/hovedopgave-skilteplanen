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
 * Which detail fields an application type uses. Excavation permits use all
 * of them (UC-034); road use permits have no direction or depth (UC-034 A1).
 */
export function getAreaFieldSet(type: ApplicationType): AreaFieldSet {
  return type === ApplicationType.ExcavationPermit
    ? { direction: true, depth: true }
    : { direction: false, depth: false };
}

export function canEditAreas(status: Status): boolean {
  return status === 'Draft' || status === 'ChangeRequired';
}

/** The last area on an application cannot be deleted (UC-035 F1). */
export function canDeleteArea(areaCount: number): boolean {
  return areaCount > 1;
}

export type AreaFieldError =
  | 'required'
  | 'positiveNumber'
  | 'postalCode'
  | 'houseNumberOrDescription';

export type AreaFieldErrors = Partial<Record<AreaFormField, AreaFieldError>>;

/** Parses a number typed with either a Danish comma or a point. */
export function parseDecimal(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return undefined;
  }
  return Number(normalized);
}

/** Area in m² = length × width, or undefined until both are valid. */
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

/** Formats with one decimal and a Danish decimal comma, e.g. `10,8`. */
export function formatSquareMeters(value: number): string {
  return value.toLocaleString('da-DK', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

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
 * Finds missing or invalid fields. Road fields are only checked for areas
 * that were entered manually (UC-034 A3).
 */
export function validateArea(
  type: ApplicationType,
  values: AreaFormValues,
  options: { includeRoad: boolean },
): AreaFieldErrors {
  const errors: AreaFieldErrors = {};

  if (options.includeRoad) {
    if (!hasText(values.roadName)) errors.roadName = 'required';
    if (!values.roadOwnership) errors.roadOwnership = 'required';
    if (!/^\d{4}$/.test(values.postalCode.trim())) {
      errors.postalCode = hasText(values.postalCode)
        ? 'postalCode'
        : 'required';
    }
  }

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

function formatNumber(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',');
}

/** Prefills the form from a saved area (UC-036). */
export function toAreaFormValues(area: Area): AreaFormValues {
  return {
    roadName: area.roadName,
    roadOwnership: area.roadOwnership,
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

function textOrNull(value: string): string | null {
  return hasText(value) ? value.trim() : null;
}

/**
 * Builds the request body. Only sends fields the application type uses,
 * and road fields only for manually entered roads.
 */
export function toAreaInput(
  type: ApplicationType,
  values: AreaFormValues,
  options: { includeRoad: boolean },
): AreaInput {
  const input: AreaInput = {};

  if (options.includeRoad) {
    input.roadName = values.roadName.trim();
    if (values.roadOwnership) input.roadOwnership = values.roadOwnership;
    input.postalCode = values.postalCode.trim();
  }

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
