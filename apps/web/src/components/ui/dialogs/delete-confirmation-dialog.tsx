import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../api/client.api.js';

type DeleteConfirmationDialogProps = {
  endpoint: string;
  entityName: string;
  onClose: () => void;
  onDeleted?: () => void;
  open: boolean;
};

/**
 * Renders a confirmation dialog and performs the requested API deletion.
 * @param props - The deletion endpoint, entity label, state, and callbacks
 * @returns The deletion confirmation dialog
 */
export default function DeleteConfirmationDialog(
  props: DeleteConfirmationDialogProps,
) {
  const { entityName, onClose, onDeleted, open } = props;
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);

  /**
   * Closes the dialog when no deletion is in progress.
   */
  const handleClose = () => {
    if (isDeleting) {
      return;
    }

    setHasError(false);
    onClose();
  };

  /**
   * Deletes the resource and reports success or failure through dialog state.
   * @returns A promise that resolves when the deletion attempt is complete
   */
  const handleDelete = async () => {
    setHasError(false);
    setIsDeleting(true);

    try {
      await apiClient.delete<void>(props.endpoint);

      onDeleted?.();
      onClose();
    } catch {
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
      onClose={handleClose}
      open={open}
    >
      <DialogTitle id={titleId}>{t('deleteConfirmation.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText id={descriptionId}>
          {t('deleteConfirmation.description', { name: entityName })}
        </DialogContentText>
        {hasError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t('deleteConfirmation.error')}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          autoFocus
          color="secondary"
          disabled={isDeleting}
          onClick={handleClose}
          variant="contained"
        >
          {t('deleteConfirmation.cancel')}
        </Button>
        <Button
          color="error"
          disabled={isDeleting}
          onClick={handleDelete}
          variant="contained"
        >
          {isDeleting
            ? t('deleteConfirmation.deleting')
            : t('deleteConfirmation.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
