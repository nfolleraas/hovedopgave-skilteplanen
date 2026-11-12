import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { availabilityLabelKeys } from '../../../features/contact-persons/contact-person-labels.js';
import type { ContactPerson } from '../../../types/contact-person.types.js';

interface DeleteContactDialogProps {
  contactPerson: ContactPerson | null;
  actorLabel: string;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation with the contact person's details (UC-032 step 3). The page
 * moves focus after closing, because a deleted contact person's button no
 * longer exists.
 */
export function DeleteContactDialog({
  contactPerson,
  actorLabel,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: DeleteContactDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      aria-describedby="delete-contact-description"
      aria-labelledby="delete-contact-title"
      disableRestoreFocus
      onClose={isDeleting ? undefined : onCancel}
      open={contactPerson !== null}
    >
      <DialogTitle id="delete-contact-title">
        {t('contacts.deleteDialog.title')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div" id="delete-contact-description">
          <strong>{contactPerson?.name}</strong>
          <br />
          {actorLabel && (
            <>
              {t('contacts.deleteDialog.actor', { value: actorLabel })}
              <br />
            </>
          )}
          {t('contacts.deleteDialog.availability', {
            value: contactPerson
              ? t(availabilityLabelKeys[contactPerson.availability])
              : '',
          })}
          <br />
          {t('contacts.deleteDialog.phoneNumber', {
            value: contactPerson?.phoneNumber,
          })}
          <br />
          {t('contacts.deleteDialog.email', { value: contactPerson?.email })}
          <br />
          <br />
          {t('contacts.deleteDialog.warning')}
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={isDeleting} onClick={onCancel} variant="outlined">
          {t('contacts.cancel')}
        </Button>
        <Button
          color="error"
          disabled={isDeleting}
          onClick={onConfirm}
          variant="contained"
        >
          {t('contacts.deleteDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
