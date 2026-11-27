import type { TFunction } from 'i18next';
import {
  type AreaEditState,
  type AreaEntry,
  isDirty,
  isRoadEditable,
} from '../../../../features/areas/area-edit-state.js';
import { areaFieldLabelKeys } from '../../../../features/areas/area-labels.js';
import {
  type AreaFieldErrors,
  emptyAreaFormValues,
  toAreaFormValues,
  validateArea,
} from '../../../../features/areas/area-validation.js';
import type { AreaFormField } from '../../../../types/area.types.js';
import type { ApplicationType } from '../../../../types/prisma-enums.js';
import type { MissingFieldsItem } from './missing-fields-summary.js';

/**
 * Finds the errors in the values the user sees: the open draft or the
 * saved area.
 * @param type - The application type
 * @param state - The current edit state
 * @param entry - The area entry
 * @returns The errors keyed by field
 */
export function areaErrorsFor(
  type: ApplicationType,
  state: AreaEditState,
  entry: AreaEntry,
): AreaFieldErrors {
  const values =
    entry.key === state.activeKey && state.draft
      ? state.draft
      : entry.saved
        ? toAreaFormValues(entry.saved)
        : emptyAreaFormValues;
  return validateArea(type, values, { includeRoad: isRoadEditable(entry) });
}

/**
 * Finds the errors in the saved values, which decide whether a collapsed
 * area is missing information.
 * @param type - The application type
 * @param entry - The area entry
 * @returns The errors keyed by field
 */
export function savedAreaErrorsFor(
  type: ApplicationType,
  entry: AreaEntry,
): AreaFieldErrors {
  const values = entry.saved
    ? toAreaFormValues(entry.saved)
    : emptyAreaFormValues;
  return validateArea(type, values, { includeRoad: isRoadEditable(entry) });
}

/**
 * Builds the card title, such as "Område 2: Strandvej".
 * @param t - The translation function
 * @param state - The current edit state
 * @param entry - The area entry
 * @returns The card title
 */
export function areaTitleFor(
  t: TFunction,
  state: AreaEditState,
  entry: AreaEntry,
): string {
  const number = state.entries.indexOf(entry) + 1;
  const road =
    (entry.key === state.activeKey ? state.draft?.roadName : undefined) ||
    entry.saved?.roadName ||
    t('areas.newRoad');
  return t('areas.cardTitle', { number, road });
}

/**
 * Finds the areas that keep the user on the step: areas with missing fields
 * or unsaved changes.
 * @param t - The translation function
 * @param type - The application type
 * @param state - The current edit state
 * @returns One summary item per area that blocks the step
 */
export function getMissingFieldsItems(
  t: TFunction,
  type: ApplicationType,
  state: AreaEditState,
): MissingFieldsItem[] {
  return state.entries
    .map((entry) => {
      const errors = areaErrorsFor(type, state, entry);
      const isUnsaved =
        !entry.saved || (entry.key === state.activeKey && isDirty(state));
      return {
        key: entry.key,
        areaTitle: areaTitleFor(t, state, entry),
        fieldLabels: (Object.keys(errors) as AreaFormField[]).map((field) =>
          t(areaFieldLabelKeys[field]),
        ),
        isUnsaved,
      };
    })
    .filter((item) => item.fieldLabels.length > 0 || item.isUnsaved);
}
