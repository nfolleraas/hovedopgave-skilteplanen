import CloseIcon from '@mui/icons-material/Close';
import DirectionsOutlinedIcon from '@mui/icons-material/DirectionsOutlined';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
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

/**
 * Presents options for uploading or creating a sign plan.
 * @param props - The dialog state and document callbacks
 * @returns The add-sign-plan dialog
 */
export default function AddSignplanDialog({
  onClose,
  onDocumentsUploaded,
  open,
}: AddSignplanDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const descriptionId = useId();
  const createTitleId = useId();
  const titleId = useId();
  const uploadTitleId = useId();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      aria-describedby={descriptionId}
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
      <DialogContent>
        <Stack spacing={3}>
          <DialogContentText id={descriptionId}>
            {t('documents.addSignplanDescription')}
          </DialogContentText>

          <Box aria-labelledby={uploadTitleId} component="section">
            <Stack spacing={2}>
              <Box>
                <Typography component="h3" id={uploadTitleId} variant="h6">
                  {t('documents.uploadExistingSignplanTitle')}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('documents.uploadExistingSignplanDescription')}
                </Typography>
              </Box>

              <DocumentDropZone
                applicationId={demoApplicationId}
                documentType="SignPlan"
                onDocumentsUploaded={onDocumentsUploaded}
              />
            </Stack>
          </Box>

          <Divider />

          <Box aria-labelledby={createTitleId} component="section">
            <Stack spacing={2}>
              <Box>
                <Typography component="h3" id={createTitleId} variant="h6">
                  {t('documents.createSignplanTitle')}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('documents.createSignplanDescription')}
                </Typography>
              </Box>

              <Button
                component={Link}
                startIcon={<DirectionsOutlinedIcon />}
                sx={{
                  alignSelf: { xs: 'stretch', sm: 'flex-start' },
                  width: { xs: '100%', sm: 'auto' },
                }}
                variant="contained"
              >
                {t('signPlan.createSignPlan')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
