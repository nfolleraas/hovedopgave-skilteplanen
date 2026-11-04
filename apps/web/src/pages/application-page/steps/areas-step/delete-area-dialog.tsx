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
import type { Area } from '../../../../types/area.types.js';

interface DeleteAreaDialogProps {
  area: Area | null;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** MUI Dialog traps focus and closes on Escape (UC-035). */
export function DeleteAreaDialog({
  area,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: DeleteAreaDialogProps) {
  const { t } = useTranslation();
  const houseNumbers =
    area?.houseNumberFrom && area.houseNumberTo
      ? `${area.houseNumberFrom}–${area.houseNumberTo}`
      : '–';

  return (
    <Dialog
      aria-describedby="delete-area-description"
      aria-labelledby="delete-area-title"
      onClose={isDeleting ? undefined : onCancel}
      open={area !== null}
    >
      <DialogTitle id="delete-area-title">
        {t('areas.deleteDialog.title')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div" id="delete-area-description">
          <strong>{area?.roadName}</strong>
          <br />
          {t('areas.deleteDialog.houseNumbers', { value: houseNumbers })}
          <br />
          {t('areas.deleteDialog.description', {
            value: area?.alternativeDescription || t('areas.deleteDialog.none'),
          })}
          <br />
          <br />
          {t('areas.deleteDialog.warning')}
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={isDeleting} onClick={onCancel} variant="outlined">
          {t('areas.cancel')}
        </Button>
        <Button
          color="error"
          disabled={isDeleting}
          onClick={onConfirm}
          variant="contained"
        >
          {t('areas.deleteDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
