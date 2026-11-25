import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteConfirmationDialog from '../../../components/ui/dialogs/delete-confirmation-dialog.js';
import type { Document } from '../document.types.js';
import { useDocuments } from '../hooks/use-documents.js';
import AddSignplanDialog from './add-signplan-dialog.js';
import DocumentDropZone from './document-drop-zone.js';
import DocumentsTable from './documents-table.js';

type DocumentsManagerProps = {
  applicationId: string;
};

/** Manages the documents and sign plans belonging to one application. */
export default function DocumentsManager({
  applicationId,
}: DocumentsManagerProps) {
  const { t } = useTranslation();
  const listTitleId = useId();
  const listTitleRef = useRef<HTMLHeadingElement>(null);
  const [isAddSignplanDialogOpen, setIsAddSignplanDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const {
    addDocuments,
    documents,
    error: loadError,
    isLoading,
    loadStatusMessage,
    removeDocument,
  } = useDocuments(applicationId);

  useEffect(() => {
    if (statusMessage) {
      listTitleRef.current?.focus();
    }
  }, [statusMessage]);

  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">
        {t('documents.description')}
      </Typography>

      {loadError && <Alert severity="error">{loadError}</Alert>}
      {statusMessage && (
        <Alert
          onClose={() => setStatusMessage(null)}
          role="status"
          severity="success"
        >
          {statusMessage}
        </Alert>
      )}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: 'stretch' }}
      >
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flex: 1,
          }}
        >
          <Button
            fullWidth
            onClick={() => setIsAddSignplanDialogOpen(true)}
            variant="outlined"
          >
            {t('documents.addSignplan')}
          </Button>
        </Box>

        <DocumentDropZone
          applicationId={applicationId}
          documentType="Other"
          onDocumentsUploaded={addDocuments}
        />
      </Stack>

      <AddSignplanDialog
        applicationId={applicationId}
        onClose={() => setIsAddSignplanDialogOpen(false)}
        onDocumentsUploaded={addDocuments}
        open={isAddSignplanDialogOpen}
      />

      {documentToDelete && (
        <DeleteConfirmationDialog
          endpoint={`/documents/${documentToDelete.uuid}`}
          entityName={documentToDelete.name}
          onClose={() => setDocumentToDelete(null)}
          onDeleted={() => {
            removeDocument(documentToDelete.uuid);
            setStatusMessage(
              t('documents.deleteSuccess', {
                name: documentToDelete.name,
              }),
            );
          }}
          open
        />
      )}

      <Paper
        aria-busy={isLoading}
        aria-labelledby={listTitleId}
        component="section"
        elevation={1}
        sx={{ overflow: 'hidden' }}
      >
        <Typography
          component="h2"
          id={listTitleId}
          ref={listTitleRef}
          sx={{ px: { xs: 2, sm: 3 }, py: 2 }}
          tabIndex={-1}
          variant="h6"
        >
          {t('documents.listTitle')}
        </Typography>
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
          {loadStatusMessage}
        </Box>
        {isLoading ? (
          <Box
            sx={{
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 4,
            }}
          >
            <CircularProgress aria-hidden="true" />
            <Typography>{t('documents.loading')}</Typography>
          </Box>
        ) : documents.length === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}
          >
            {t('documents.empty')}
          </Typography>
        ) : (
          <DocumentsTable
            documents={documents}
            labelledBy={listTitleId}
            onDelete={(document) => {
              setStatusMessage(null);
              setDocumentToDelete(document);
            }}
          />
        )}
      </Paper>
    </Stack>
  );
}
