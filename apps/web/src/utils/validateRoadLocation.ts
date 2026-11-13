import type { TFunction } from 'i18next';
import {
  type HouseNumberRange,
  validateHouseNumberRange,
} from './validateHouseNumberRange';

export type RoadLocation = HouseNumberRange & {
  road: string;
  postalCode: string;
  city: string;
};

/** Validates the road, house-number range, four-digit postal code, and city. */
export function validateRoadLocation(value: RoadLocation, t: TFunction) {
  return {
    road: value.road.trim() ? undefined : t('permit.errors.road'),
    ...validateHouseNumberRange(value, t),
    postalCode: /^\d{4}$/.test(value.postalCode.trim())
      ? undefined
      : t('permit.errors.postalCode'),
    city: value.city.trim() ? undefined : t('permit.errors.city'),
  };
}
