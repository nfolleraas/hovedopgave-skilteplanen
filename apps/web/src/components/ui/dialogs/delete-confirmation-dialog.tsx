import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

interface DeleteConfirmationDialogProps {
  open: boolean;
  name: string;
  description?: string;
  isDeleting?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
  onExited?: () => void;
}

/**
 * @summary Confirm deletion with a translated message naming the item
 * or a caller-provided description, displaying any error state and
 * preventing confirmation and dismissal while deletion is in progress.
 */
export function DeleteConfirmationDialog({
  open,
  name,
  description,
  isDeleting = false,
  error,
  onClose,
  onConfirm,
  onExited,
}: DeleteConfirmationDialogProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      open={open}
      slotProps={{ transition: { onExited } }}
    >
      <DialogTitle id={titleId}>
        {t('dialogs.deleteConfirmation.title')}
      </DialogTitle>
      <DialogContent aria-busy={isDeleting}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography
          color="text.secondary"
          id={descriptionId}
          sx={{ overflowWrap: 'anywhere' }}
        >
          {description ?? t('dialogs.deleteConfirmation.description', { name })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button autoFocus disabled={isDeleting} onClick={onClose}>
          {t('dialogs.deleteConfirmation.cancel')}
        </Button>
        <Button
          color="error"
          disabled={isDeleting}
          onClick={() => {
            if (!isDeleting) onConfirm();
          }}
          variant="contained"
        >
          {isDeleting
            ? t('dialogs.deleteConfirmation.deleting')
            : t('dialogs.deleteConfirmation.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
