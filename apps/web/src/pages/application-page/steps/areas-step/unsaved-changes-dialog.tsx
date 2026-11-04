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
  areaTitle: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** Asked before another area is expanded over unsaved changes (UC-036). */
export function UnsavedChangesDialog({
  open,
  areaTitle,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      aria-describedby="unsaved-changes-description"
      aria-labelledby="unsaved-changes-title"
      onClose={onCancel}
      open={open}
    >
      <DialogTitle id="unsaved-changes-title">
        {t('areas.unsavedDialog.title')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="unsaved-changes-description">
          {t('areas.unsavedDialog.text', { area: areaTitle })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} variant="outlined">
          {t('areas.cancel')}
        </Button>
        <Button color="error" onClick={onDiscard} variant="outlined">
          {t('areas.unsavedDialog.discard')}
        </Button>
        <Button onClick={onSave} variant="contained">
          {t('areas.unsavedDialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
