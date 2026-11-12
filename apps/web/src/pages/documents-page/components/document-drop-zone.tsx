import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { acceptedFileTypes } from '../document.constants.js';
import type { Document, DocumentType } from '../document.types.js';
import { useDocumentUpload } from '../hooks/use-document-upload.js';
import { useDragAndDrop } from '../hooks/use-drag-and-drop.js';

type DocumentDropZoneProps = {
  applicationId: string;
  documentType: DocumentType;
  onDocumentsUploaded: (documents: Document[]) => void;
};

/**
 * Renders an accessible file picker and desktop drag-and-drop upload area.
 * @param props - The application, document type, and upload callback
 * @returns The document upload controls and status feedback
 */
export default function DocumentDropZone({
  applicationId,
  documentType,
  onDocumentsUploaded,
}: DocumentDropZoneProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileSupportedFileTypesId = useId();
  const promptId = useId();
  const supportedFileTypesId = useId();
  const isSignPlan = documentType === 'SignPlan';
  const dropPrompt = isSignPlan
    ? t('documents.signPlanDropPrompt')
    : t('documents.dropPrompt');
  const {
    error,
    setError,
    handleFileSelected,
    isUploading,
    successMessage,
    setSuccessMessage,
    uploadFiles,
  } = useDocumentUpload({
    applicationId,
    documentType,
    onDocumentsUploaded,
  });
  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDragging,
  } = useDragAndDrop({ isUploading, uploadFiles });
  const uploadLabel = isUploading
    ? isSignPlan
      ? t('documents.uploadingSignPlan')
      : t('documents.uploading')
    : isSignPlan
      ? t('documents.uploadSignPlan')
      : t('documents.upload');

  return (
    <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
      {error && (
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert
          onClose={() => setSuccessMessage(null)}
          role="status"
          severity="success"
        >
          {successMessage}
        </Alert>
      )}
      <Box
        aria-live="polite"
        role="status"
        sx={{
          border: 0,
          clip: 'rect(0 0 0 0)',
          height: '1px',
          m: '-1px',
          overflow: 'hidden',
          p: 0,
          position: 'absolute',
          whiteSpace: 'nowrap',
          width: '1px',
        }}
      >
        {isUploading ? uploadLabel : ''}
      </Box>
      <Box
        id={mobileSupportedFileTypesId}
        sx={{
          border: 0,
          clip: 'rect(0 0 0 0)',
          display: { xs: 'block', md: 'none' },
          height: '1px',
          m: '-1px',
          overflow: 'hidden',
          p: 0,
          position: 'absolute',
          whiteSpace: 'nowrap',
          width: '1px',
        }}
      >
        {t('documents.supportedFileTypes')}
      </Box>
      <Button
        aria-describedby={mobileSupportedFileTypesId}
        disabled={isUploading}
        fullWidth
        onClick={() => fileInputRef.current?.click()}
        startIcon={
          isUploading ? (
            <CircularProgress aria-hidden="true" size={20} />
          ) : (
            <CloudUploadOutlinedIcon />
          )
        }
        sx={{ display: { xs: 'inline-flex', md: 'none' } }}
        type="button"
        variant="contained"
      >
        {uploadLabel}
      </Button>
      <Paper
        aria-busy={isUploading}
        aria-labelledby={promptId}
        component="section"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          borderColor: isDragging ? 'primary.main' : 'divider',
          borderStyle: 'dashed',
          flex: 1,
          minWidth: 0,
          p: { xs: 3, sm: 4 },
          display: { xs: 'none', md: 'block' },
          textAlign: 'center',
          transition: (theme) =>
            theme.transitions.create(['background-color', 'border-color']),
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
        }}
        variant="outlined"
      >
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <CloudUploadOutlinedIcon color="primary" fontSize="large" />
          <Typography id={promptId}>{dropPrompt}</Typography>
          <Typography
            color="text.secondary"
            id={supportedFileTypesId}
            variant="body2"
          >
            {t('documents.supportedFileTypes')}
          </Typography>
          <Button
            aria-describedby={supportedFileTypesId}
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            startIcon={
              isUploading ? (
                <CircularProgress aria-hidden="true" size={20} />
              ) : undefined
            }
            type="button"
            variant="contained"
          >
            {uploadLabel}
          </Button>
        </Stack>
      </Paper>
      <input
        accept={acceptedFileTypes}
        hidden
        multiple
        onChange={handleFileSelected}
        ref={fileInputRef}
        type="file"
      />
    </Stack>
  );
}
