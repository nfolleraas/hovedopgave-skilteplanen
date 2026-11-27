import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

type SaveStatus = 'idle' | 'saving' | 'saved';

/** The draft's save status and the Save draft button. */
export function DraftSaveBar({
  saveStatus,
  saveError,
  disabled,
  onSave,
}: {
  saveStatus: SaveStatus;
  saveError?: string;
  disabled: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const statusText = {
    idle: '',
    saving: t('permit.draft.saving'),
    saved: t('permit.draft.saved'),
  }[saveStatus];

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        mb: 2,
      }}
    >
      <Typography role="status" sx={{ textAlign: 'end' }}>
        {saveError ?? statusText}
      </Typography>
      <Button
        disabled={disabled}
        onClick={onSave}
        sx={{ minHeight: 44 }}
        variant="outlined"
      >
        {t('permit.actions.saveDraft')}
      </Button>
    </Box>
  );
}

/** Asks what to do with unsaved changes before the user leaves the form. */
export function UnsavedDraftDialog({
  open,
  isWriting,
  saving,
  saveError,
  onKeepEditing,
  onLeave,
  onSaveAndLeave,
}: {
  open: boolean;
  /** A save or submission is running, so the choices wait for it. */
  isWriting: boolean;
  saving: boolean;
  saveError?: string;
  onKeepEditing: () => void;
  onLeave: () => void;
  onSaveAndLeave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      aria-describedby="permit-unsaved-description"
      aria-labelledby="permit-unsaved-title"
      onClose={() => {
        if (!isWriting) onKeepEditing();
      }}
      open={open}
    >
      <DialogTitle id="permit-unsaved-title">
        {t('permit.draft.unsavedTitle')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="permit-unsaved-description">
          {t('permit.draft.unsavedDescription')}
        </DialogContentText>
        {saving && (
          <Typography role="status" sx={{ mt: 2 }}>
            {t('permit.draft.saving')}
          </Typography>
        )}
        {saveError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {saveError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          '& .MuiButton-root': { minHeight: 44 },
        }}
      >
        <Button autoFocus disabled={isWriting} onClick={onKeepEditing}>
          {t('permit.draft.keepEditing')}
        </Button>
        <Button disabled={isWriting} onClick={onLeave}>
          {t('permit.draft.leaveWithoutSaving')}
        </Button>
        <Button
          disabled={isWriting}
          onClick={onSaveAndLeave}
          variant="contained"
        >
          {t('permit.draft.saveAndLeave')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
