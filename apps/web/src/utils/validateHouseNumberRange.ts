import type { TFunction } from 'i18next';

export type HouseNumberRange = {
  houseNumberFrom: string;
  houseNumberTo: string;
};

export function compareHouseNumbers(first: string, second: string) {
  return first.localeCompare(second, 'da', {
    numeric: true,
    sensitivity: 'base',
  });
}

export function validateHouseNumberRange(
  value: HouseNumberRange,
  t: TFunction,
) {
  const houseNumberFrom = value.houseNumberFrom.trim();
  const houseNumberTo = value.houseNumberTo.trim();
  const houseNumberPattern = /^[1-9]\d*[a-zæøå]?$/i;
  const invalidFrom =
    houseNumberFrom && !houseNumberPattern.test(houseNumberFrom);
  const invalidTo = houseNumberTo && !houseNumberPattern.test(houseNumberTo);

  let houseNumberFromError: string | undefined;
  let houseNumberToError: string | undefined;
  if (invalidFrom) {
    houseNumberFromError = t('permit.errors.houseNumberFrom');
  } else if (!houseNumberFrom && houseNumberTo) {
    houseNumberFromError = t('permit.errors.houseNumberMissing');
  }
  if (invalidTo) {
    houseNumberToError = t('permit.errors.houseNumberTo');
  } else if (
    houseNumberFrom &&
    houseNumberTo &&
    !invalidFrom &&
    compareHouseNumbers(houseNumberFrom, houseNumberTo) > 0
  ) {
    houseNumberToError = t('permit.errors.houseNumberOrder');
  }

  return {
    houseNumberFrom: houseNumberFromError,
    houseNumberTo: houseNumberToError,
  };
}
