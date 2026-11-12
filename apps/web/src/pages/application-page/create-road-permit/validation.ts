import type { TFunction } from 'i18next';
import { municipalities } from '../../../data/municipalities';
import { validateRoadLocation } from '../../../utils/validateRoadLocation';
import type {
  ContactInformation,
  MaterialDraft,
  UsageDetails,
} from './formTypes';

export function validateMunicipalityAndTitle(
  title: string,
  municipalityName: string | null,
  t: TFunction,
) {
  return {
    title: title.trim() ? undefined : t('permit.errors.title'),
    municipality:
      municipalityName !== null && municipalities.includes(municipalityName)
        ? undefined
        : t('permit.errors.municipality'),
  };
}

export function hasMaterialDraft(draft: MaterialDraft) {
  return Boolean(
    draft.editingId ||
      draft.type ||
      draft.quantity !== '1' ||
      draft.notes.trim(),
  );
}

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

export function validateContactInformation(
  value: ContactInformation,
  t: TFunction,
) {
  const phone = value.phone.replace(/[\s().-]/g, '');
  const validPhone = /^(?:\d{8}|(?:\+|00)[1-9]\d{6,14})$/.test(phone);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim());

  return {
    name: value.name.trim() ? undefined : t('permit.errors.contactName'),
    phone: validPhone ? undefined : t('permit.errors.contactPhone'),
    email: validEmail ? undefined : t('permit.errors.contactEmail'),
  };
}
