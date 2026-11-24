import type { TFunction } from 'i18next';
import type { Municipality } from '../../../api/municipalities.api';
import { validateRoadLocation } from '../../../utils/validateRoadLocation';
import type { MaterialDraft, UsageDetails } from './formTypes';

/** Requires a nonblank title and a municipality from the supported list. */
export function validateMunicipalityAndTitle(
  title: string,
  municipalityName: string | null,
  municipalities: Municipality[],
  t: TFunction,
) {
  return {
    title: title.trim() ? undefined : t('permit.errors.title'),
    municipality: municipalities.some(({ name }) => name === municipalityName)
      ? undefined
      : t('permit.errors.municipality'),
  };
}

/** Checks whether the material editor has an active edit or unsaved input. */
export function hasMaterialDraft(draft: MaterialDraft) {
  return Boolean(
    draft.editingId ||
      draft.type ||
      draft.quantity !== '1' ||
      draft.notes.trim(),
  );
}

/** Validates the usage type, date order, and road location fields. */
export function validateUsageDetails(value: UsageDetails, t: TFunction) {
  let endDate: string | undefined;
  if (!value.endDate) {
    endDate = t('permit.errors.endDate');
  } else if (
    value.startDate &&
    Number(value.endDate.replaceAll('-', '')) <
      Number(value.startDate.replaceAll('-', ''))
  ) {
    endDate = t('permit.errors.dateOrder');
  }

  return {
    usage: value.usage ? undefined : t('permit.errors.usage'),
    startDate: value.startDate ? undefined : t('permit.errors.startDate'),
    endDate,
    ...validateRoadLocation(value, t),
  };
}
