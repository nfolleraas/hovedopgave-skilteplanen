import { isAxiosError } from 'axios';
import type { TFunction } from 'i18next';

/** The status and error code (such as `LAST_CONTACT_PERSON`) the API sent. */
export function apiFailure(error: unknown): { status?: number; code?: string } {
  if (!isAxiosError<{ code?: string }>(error)) return {};
  return { status: error.response?.status, code: error.response?.data?.code };
}

/** A specific message for each error the API can send (UC-031 F5). */
export function saveErrorMessage(t: TFunction, error: unknown): string {
  if (!isAxiosError(error)) return t('contacts.saveError');
  const { status, code } = apiFailure(error);
  switch (code) {
    case 'APPLICATION_NOT_EDITABLE':
      return t('contacts.notEditable');
    case 'ACTOR_NOT_FOUND':
      return t('contacts.actorNotFound');
    case 'CONTACT_PERSON_DUPLICATE':
      return t('contacts.duplicate');
    // Deleted in another tab while this one had it open.
    case 'CONTACT_PERSON_NOT_FOUND':
      return t('contacts.notFound');
    case 'APPLICATION_NOT_FOUND':
      return t('applicationWizard.caseNotFound');
    // The form checks the same rules, so this only happens if the rules
    // differ between the web app and the API.
    case 'CONTACT_PERSON_INVALID':
    case 'CONTACT_PERSON_FIELDS_NOT_ALLOWED':
      return t('contacts.rejectedByServer');
    default:
      return status === 400
        ? t('contacts.rejectedByServer')
        : t('contacts.saveError');
  }
}

/** The message when a contact person could not be deleted. */
export function deleteErrorMessage(t: TFunction, code?: string): string {
  if (code === 'LAST_CONTACT_PERSON') return t('contacts.lastContactError');
  if (code === 'APPLICATION_NOT_EDITABLE') return t('contacts.notEditable');
  // UC-032 F4: the contact person could not be deleted.
  return t('contacts.deleteError');
}
