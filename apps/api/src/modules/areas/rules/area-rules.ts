import {
  ApplicationType,
  Direction,
  RoadSection,
  RoadSide,
  Status,
} from '../../../generated/prisma/enums.js';

/** Area fields that can be checked against the application type. */
export interface AreaRuleInput {
  houseNumberFrom?: string | null;
  houseNumberTo?: string | null;
  alternativeDescription?: string | null;
  roadSection?: RoadSection | null;
  roadSectionDescription?: string | null;
  roadSide?: RoadSide | null;
  direction?: Direction | null;
  lengthInMeters?: number | null;
  widthInMeters?: number | null;
  depthInMeters?: number | null;
}

export type AreaRuleField =
  | 'houseNumberFrom'
  | 'houseNumberTo'
  | 'alternativeDescription'
  | 'roadSection'
  | 'roadSectionDescription'
  | 'roadSide'
  | 'direction'
  | 'lengthInMeters'
  | 'widthInMeters'
  | 'depthInMeters';

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

const editableStatuses: readonly Status[] = [
  Status.Draft,
  Status.ChangeRequired,
];

export function canEditAreas(status: Status): boolean {
  return editableStatuses.includes(status);
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositive(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Returns the fields that are missing or invalid for a complete area.
 * Either both house numbers or an alternative description is enough
 * (UC-034 F1).
 */
export function findInvalidAreaFields(
  type: ApplicationType,
  input: AreaRuleInput,
): AreaRuleField[] {
  const fields = getAreaFieldSet(type);
  const invalid: AreaRuleField[] = [];
  const hasFrom = hasText(input.houseNumberFrom);
  const hasTo = hasText(input.houseNumberTo);

  if (!hasText(input.alternativeDescription) && !(hasFrom && hasTo)) {
    if (!hasFrom) invalid.push('houseNumberFrom');
    if (!hasTo) invalid.push('houseNumberTo');
    if (!hasFrom && !hasTo) invalid.push('alternativeDescription');
  }
  if (!input.roadSection) {
    invalid.push('roadSection');
  } else if (
    input.roadSection === RoadSection.Other &&
    !hasText(input.roadSectionDescription)
  ) {
    invalid.push('roadSectionDescription');
  }
  if (!input.roadSide) invalid.push('roadSide');
  if (fields.direction && !input.direction) invalid.push('direction');
  if (!isPositive(input.lengthInMeters)) invalid.push('lengthInMeters');
  if (!isPositive(input.widthInMeters)) invalid.push('widthInMeters');
  if (fields.depth && !isPositive(input.depthInMeters)) {
    invalid.push('depthInMeters');
  }

  return invalid;
}

export function calculateAreaInSquareMeters(
  lengthInMeters: number,
  widthInMeters: number,
): number {
  return lengthInMeters * widthInMeters;
}
