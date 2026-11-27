import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface UnsavedChangesDialogProps {
  open: boolean;
  contactTitle: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Asked before another contact person is expanded over unsaved changes
 * (UC-033). The page moves focus after closing, as the trigger may be gone.
 */
export function UnsavedChangesDialog({
  open,
  contactTitle,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      aria-describedby="unsaved-changes-description"
      aria-labelledby="unsaved-changes-title"
      disableRestoreFocus
      onClose={onCancel}
      open={open}
    >
      <DialogTitle id="unsaved-changes-title">
        {t('contacts.unsavedDialog.title')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="unsaved-changes-description">
          {t('contacts.unsavedDialog.text', { contact: contactTitle })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="outlined">
          {t('contacts.cancel')}
        </Button>
        <Button color="error" onClick={onDiscard} variant="outlined">
          {t('contacts.unsavedDialog.discard')}
        </Button>
        <Button onClick={onSave} variant="contained">
          {t('contacts.unsavedDialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
