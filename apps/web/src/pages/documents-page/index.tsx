import { Box, Button, Stack, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddSignplanDialog from './components/add-signplan-dialog.js';
import DocumentDropZone from './components/document-drop-zone.js';
import DocumentsTable from './components/documents-table.js';
import type { DocumentsState } from './hooks/use-documents.js';

type DocumentsPageProps = {
  applicationId: string;
  documentsState: DocumentsState;
  listHeadingLevel?: 'h2' | 'h3';
};

/** Renders document uploads and the application-scoped document table. */
export default function DocumentsPage({
  applicationId,
  documentsState,
  listHeadingLevel = 'h2',
}: DocumentsPageProps): JSX.Element {
  const { t } = useTranslation();
  const [isAddSignplanDialogOpen, setIsAddSignplanDialogOpen] = useState(false);

  return (
    <Stack spacing={3}>
      <Typography color="text.secondary">
        {t('documents.description')}
      </Typography>

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
          onDocumentsUploaded={documentsState.addDocuments}
        />
      </Stack>

      <AddSignplanDialog
        applicationId={applicationId}
        onClose={() => setIsAddSignplanDialogOpen(false)}
        onDocumentsUploaded={documentsState.addDocuments}
        open={isAddSignplanDialogOpen}
      />

      <DocumentsTable
        documentsState={documentsState}
        headingLevel={listHeadingLevel}
      />
    </Stack>
  );
}
