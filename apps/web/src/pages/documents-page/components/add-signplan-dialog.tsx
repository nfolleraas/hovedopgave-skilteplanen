import CloseIcon from '@mui/icons-material/Close';
import DirectionsOutlinedIcon from '@mui/icons-material/DirectionsOutlined';
import {
  Button,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { demoApplicationId } from '../document.constants.js';
import type { Document } from '../document.types.js';
import DocumentDropZone from './document-drop-zone.js';

type AddSignplanDialogProps = {
  onClose: () => void;
  onDocumentsUploaded: (documents: Document[]) => void;
  open: boolean;
};

export default function AddSignplanDialog({
  onClose,
  onDocumentsUploaded,
  open,
}: AddSignplanDialogProps) {
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
        <Container
          sx={{
            gap: 2,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <DocumentDropZone
            applicationId={demoApplicationId}
            documentType="SignPlan"
            onDocumentsUploaded={onDocumentsUploaded}
          />

          <Button
            component={Link}
            startIcon={<DirectionsOutlinedIcon />}
            variant="contained"
          >
            {t('signPlan.createSignPlan')}
          </Button>
        </Container>
      </DialogContent>
    </Dialog>
  );
}
