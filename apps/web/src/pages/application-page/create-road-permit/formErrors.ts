import type { TFunction } from 'i18next';
import { getTrafficChangeLabels } from './permitOptions';
import type { RejectedSelection, WriteFailure } from './useRoadPermitWrites';

/** The message for a choice the API no longer accepts, per field. */
export function getRejectionErrors(
  t: TFunction,
  rejected: RejectedSelection | undefined,
) {
  if (rejected?.field === 'municipality') {
    return { municipality: t('permit.errors.municipalityUnavailable') };
  }
  if (rejected?.field === 'material') {
    return {
      unavailableMaterial: {
        type: rejected.value,
        message: t('permit.errors.materialUnavailable'),
      },
    };
  }
  if (rejected?.field === 'trafficChange') {
    const labels = getTrafficChangeLabels(t);
    const change = rejected.value;
    return {
      trafficChange: t('permit.errors.trafficChangeUnavailable', {
        change: Object.hasOwn(labels, change) ? labels[change] : change,
      }),
    };
  }
  return {};
}

/** Why the draft could not be saved. */
export function saveFailureMessage(t: TFunction, failure?: WriteFailure) {
  if (!failure) return undefined;
  return {
    conflict: t('permit.draft.conflictError'),
    network: t('permit.draft.saveNetworkError'),
    serviceUnavailable: t('permit.errors.serviceUnavailable'),
    unexpected: t('permit.draft.saveError'),
  }[failure];
}

/** Why the application could not be submitted. */
export function submissionFailureMessage(t: TFunction, failure?: WriteFailure) {
  if (!failure) return undefined;
  return {
    conflict: t('permit.draft.conflictError'),
    network: t('permit.summary.submissionNetworkError'),
    serviceUnavailable: t('permit.errors.serviceUnavailable'),
    unexpected: t('permit.summary.submissionError'),
  }[failure];
}
