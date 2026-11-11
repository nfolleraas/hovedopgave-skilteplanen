import DirectionsOutlinedIcon from '@mui/icons-material/DirectionsOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { routes } from '../../app/router.js';
import DeleteConfirmationDialog from '../../components/ui/dialogs/delete-confirmation-dialog.js';
import AddSignplanDialog from './components/add-signplan-dialog.js';
import DocumentDropZone from './components/document-drop-zone.js';
import DocumentsTable from './components/documents-table.js';
import { demoApplicationId } from './document.constants.js';
import type { Document } from './document.types.js';
import { useDocuments } from './hooks/use-documents.js';

export default function DocumentsPage() {
  const { i18n, t } = useTranslation();
  const listTitleId = useId();
  const listTitleRef = useRef<HTMLHeadingElement>(null);
  const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const [isAddSignplanDialogOpen, setIsAddSignplanDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );
  const [pageStatusMessage, setPageStatusMessage] = useState<string | null>(
    null,
  );

  const {
    addDocuments,
    documents,
    error: loadError,
    isLoading,
    loadStatusMessage,
    removeDocument,
  } = useDocuments();
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('da')
    ? 'da'
    : 'en';

  useEffect(() => {
    const previousTitle = document.title;
    document.documentElement.lang = language;
    document.title = `${t('documents.title')} – ${t('common.brandName')}`;

    return () => {
      document.title = previousTitle;
    };
  }, [language, t]);

  useEffect(() => {
    pageTitleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pageStatusMessage) {
      listTitleRef.current?.focus();
    }
  }, [pageStatusMessage]);

  return (
    <Box component="main" id="main-content" sx={{ display: 'flex' }}>
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          py: { xs: 4, sm: 8 },
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography
              component="h1"
              ref={pageTitleRef}
              sx={{ fontSize: 'clamp(1.75rem, 5vw, 2.125rem)' }}
              tabIndex={-1}
              variant="h4"
            >
              {t('documents.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('documents.description')}
            </Typography>
          </Box>

          {loadError && <Alert severity="error">{loadError}</Alert>}
          {pageStatusMessage && (
            <Alert role="status" severity="success">
              {pageStatusMessage}
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
                startIcon={<DirectionsOutlinedIcon />}
                variant="outlined"
              >
                {t('documents.addSignplan')}
              </Button>
            </Box>

            <DocumentDropZone
              applicationId={demoApplicationId}
              documentType="Other"
              onDocumentsUploaded={addDocuments}
            />
          </Stack>

          <AddSignplanDialog
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
                setPageStatusMessage(
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
                  setPageStatusMessage(null);
                  setDocumentToDelete(document);
                }}
              />
            )}
          </Paper>
        </Stack>
        <Stack
          aria-label={t('documents.pageNavigation')}
          component="nav"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'center',
            mt: 'auto',
            pt: 3,
          }}
        >
          <Button
            color="secondary"
            component={Link}
            to={routes.application}
            variant="contained"
          >
            {t('navigation.back')}
          </Button>
          <Button component={Link} to={routes.contacts} variant="contained">
            {t('navigation.next')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
