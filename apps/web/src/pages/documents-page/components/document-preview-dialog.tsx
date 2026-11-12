import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { Document } from '../document.types.js';

type DocumentPreviewDialogProps = {
  document: Document;
  onClose: () => void;
};

/**
 * Displays an uploaded document without navigating away from the platform.
 * @param props - The document to preview and close callback
 * @returns A responsive document preview dialog
 */
export default function DocumentPreviewDialog({
  document,
  onClose,
}: DocumentPreviewDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const titleId = useId();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      aria-labelledby={titleId}
      fullScreen={isSmallScreen}
      fullWidth
      maxWidth="lg"
      onClose={onClose}
      open
    >
      <DialogTitle id={titleId} sx={{ overflowWrap: 'anywhere', pr: 7 }}>
        {t('documents.previewTitle', { name: document.name })}
      </DialogTitle>
      <IconButton
        aria-label={t('documents.closePreview', { name: document.name })}
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent
        dividers
        sx={{ display: 'flex', minHeight: { xs: 0, sm: '70dvh' }, p: 0 }}
      >
        <Box
          component="iframe"
          src={document.url}
          sx={{ border: 0, flex: 1, width: '100%' }}
          title={t('documents.previewFrameTitle', { name: document.name })}
        />
      </DialogContent>
    </Dialog>
  );
}
