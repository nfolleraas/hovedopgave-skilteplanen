import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';

type AddSignplanModalProps = {
  onClose: () => void;
  open: boolean;
};

export default function AddSignplanModal({
  onClose,
  open,
}: AddSignplanModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      aria-labelledby="add-signplan-modal-title"
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
    >
      <DialogTitle id="add-signplan-modal-title">
        {t('documents.addSignplan')}
      </DialogTitle>
      <IconButton
        aria-label={t('documents.closeAddSignplan')}
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent />
    </Dialog>
  );
}
