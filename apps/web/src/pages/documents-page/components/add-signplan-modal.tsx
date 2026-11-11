import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { demoApplicationId } from '../document.constants.js';
import type { Document } from '../document.types.js';
import DocumentDropZone from './document-drop-zone.js';

type AddSignplanModalProps = {
  onClose: () => void;
  onDocumentsUploaded: (documents: Document[]) => void;
  open: boolean;
};

export default function AddSignplanModal({
  onClose,
  onDocumentsUploaded,
  open,
}: AddSignplanModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const titleId = useId();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      aria-labelledby={titleId}
      fullScreen={isSmallScreen}
      fullWidth
      maxWidth="sm"
      onClose={onClose}
      open={open}
    >
      <DialogTitle id={titleId} sx={{ pr: 7 }}>
        {t('documents.addSignplan')}
      </DialogTitle>
      <IconButton
        aria-label={t('documents.closeAddSignplan')}
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ display: 'flex' }}>
        <DocumentDropZone
          applicationId={demoApplicationId}
          documentType="SignPlan"
          onDocumentsUploaded={onDocumentsUploaded}
        />
      </DialogContent>
    </Dialog>
  );
}
