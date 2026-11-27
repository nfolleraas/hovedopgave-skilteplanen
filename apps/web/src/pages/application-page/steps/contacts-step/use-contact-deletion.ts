import { type Dispatch, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteContactPerson } from '../../../../api/contact-persons.api.js';
import type {
  ContactPersonEditAction,
  ContactPersonEntry,
} from '../../../../features/contact-persons/contact-person-edit-state.js';
import { canDeleteContactPerson } from '../../../../features/contact-persons/contact-person-validation.js';
import type { ContactPerson } from '../../../../types/contact-person.types.js';
import { apiFailure, deleteErrorMessage } from './contact-step-errors.js';

/** A message after saving or deleting, read aloud by screen readers. */
export interface ContactNotice {
  severity: 'success' | 'error';
  message: string;
}

interface ContactDeletionOptions {
  dispatch: Dispatch<ContactPersonEditAction>;
  savedCount: number;
  /** The contact person in the delete dialog, owned by the step. */
  deleteTarget: ContactPerson | null;
  setDeleteTarget: (target: ContactPerson | null) => void;
  setNotice: (notice: ContactNotice | null) => void;
  /** Moves focus away from a contact person that disappears. */
  focusAfterRemoving: (key: string) => void;
}

/** Deleting a contact person after confirmation (UC-032). */
export function useContactDeletion({
  dispatch,
  savedCount,
  deleteTarget,
  setDeleteTarget,
  setNotice,
  focusAfterRemoving,
}: ContactDeletionOptions) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** Asks for confirmation, unless it is the last contact person (F1). */
  function handleDelete(entry: ContactPersonEntry) {
    if (!entry.saved) return;
    setNotice(null);
    if (!canDeleteContactPerson(savedCount)) {
      setNotice({ severity: 'error', message: t('contacts.lastContactError') });
      return;
    }
    setDeleteError(null);
    setDeleteTarget(entry.saved);
  }

  function removed(target: ContactPerson, messageKey: string) {
    focusAfterRemoving(target.uuid);
    dispatch({ type: 'removed', key: target.uuid });
    setNotice({
      severity: 'success',
      message: t(messageKey, { name: target.name }),
    });
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteContactPerson(deleteTarget.uuid);
      removed(deleteTarget, 'contacts.deleted');
    } catch (error) {
      const { code } = apiFailure(error);
      // Deleted in another tab: the result is the same, so show it as done.
      if (code === 'CONTACT_PERSON_NOT_FOUND') {
        removed(deleteTarget, 'contacts.alreadyDeleted');
        return;
      }
      setDeleteError(deleteErrorMessage(t, code));
    } finally {
      setIsDeleting(false);
    }
  }

  return { isDeleting, deleteError, handleDelete, confirmDelete };
}
