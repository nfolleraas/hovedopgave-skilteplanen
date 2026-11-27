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
import {
  availabilityLabelKeys,
  formatPhoneNumber,
} from '../../../../features/contact-persons/contact-person-labels.js';
import type { ContactPerson } from '../../../../types/contact-person.types.js';

interface DeleteContactDialogProps {
  contactPerson: ContactPerson | null;
  /** The actor's name, e.g. "Vejbyg A/S". */
  actorName: string;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation with the contact person's details (UC-032 step 4). The step
 * moves focus after closing, because a deleted contact person's button no
 * longer exists.
 */
export function DeleteContactDialog({
  contactPerson,
  actorName,
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
        {contactPerson && (
          <DialogContentText component="div" id="delete-contact-description">
            <strong>
              {actorName
                ? `${contactPerson.name} · ${actorName}`
                : contactPerson.name}
            </strong>
            <br />
            {`${t(availabilityLabelKeys[contactPerson.availability])} · ${formatPhoneNumber(contactPerson.phoneNumber)}`}
            <br />
            {contactPerson.email}
            <br />
            <br />
            {t('contacts.deleteDialog.warning')}
          </DialogContentText>
        )}
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
