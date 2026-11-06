import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createDocument, getDocuments } from '../../api/documents.api.js';
import type { Document } from './document.types.js';

const demoApplicationId = 'DEMO-2026-0001';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getDocuments()
      .then((loadedDocuments) => {
        if (isMounted) {
          setDocuments(loadedDocuments);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(t('documents.loadError'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadedDocument = await createDocument(
        file,
        demoApplicationId,
        "Other",
      );

      setDocuments((currentDocuments) => [
        ...currentDocuments,
        uploadedDocument,
      ]);
    } catch {
      setError(t('documents.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main>
      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 8 } }}>
        <Stack spacing={3}>
          <Box>
            <Typography component="h1" variant="h4">
              {t('documents.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('documents.description')}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            component="label"
            disabled={isUploading}
            startIcon={
              isUploading ? (
                <CircularProgress size={20} />
              ) : (
                <CloudUploadOutlinedIcon />
              )
            }
            variant="contained"
          >
            {isUploading ? t('documents.uploading') : t('documents.upload')}
            <input
              accept="application/pdf,.pdf"
              hidden
              onChange={handleFileSelected}
              ref={fileInputRef}
              type="file"
            />
          </Button>

          <Paper elevation={1} sx={{ overflow: 'hidden' }}>
            <Typography component="h2" sx={{ px: 3, py: 2 }} variant="h6">
              {t('documents.listTitle')}
            </Typography>
            {isLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}>
                <CircularProgress aria-label={t('documents.loading')} />
              </Box>
            ) : documents.length === 0 ? (
              <Typography color="text.secondary" sx={{ px: 3, pb: 3 }}>
                {t('documents.empty')}
              </Typography>
            ) : (
              <List disablePadding>
                {documents.map((document) => (
                  <ListItem divider key={document.uuid}>
                    <ListItemText
                      primary={
                        <Link
                          href={document.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {document.name}
                        </Link>
                      }
                      secondary={new Date(document.date).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
      </Container>
    </main>
  );
}
