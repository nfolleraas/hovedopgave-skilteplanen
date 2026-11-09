import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChangeEvent, DragEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createDocument,
  deleteDocument,
  getDocuments,
} from '../../api/documents.api.js';
import AddSignplanModal from './add-signplan-modal.js';
import type { Document } from './document.types.js';

const demoApplicationId = 'DEMO-2026-0001';
const acceptedFileTypes =
  'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAddSignplanModalOpen, setIsAddSignplanModalOpen] = useState(false);
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

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadResults = await Promise.allSettled(
        files.map((file) => createDocument(file, demoApplicationId, 'Other')),
      );
      const uploadedDocuments = uploadResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );

      if (uploadedDocuments.length > 0) {
        setDocuments((currentDocuments) => [
          ...currentDocuments,
          ...uploadedDocuments,
        ]);
      }

      if (uploadResults.some((result) => result.status === 'rejected')) {
        setError(t('documents.uploadError'));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    await uploadFiles(files);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;

    if (dragDepthRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current > 0) {
      return;
    }

    setIsDragging(false);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);

    if (isUploading) {
      return;
    }

    await uploadFiles(Array.from(event.dataTransfer.files));
  };

  const handleDelete = async (uuid: string) => {
    setError(null);

    try {
      await deleteDocument(uuid);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.uuid !== uuid),
      );
    } catch {
      setError(t('documents.deleteError'));
    }
  };

  return (
    <Box component="main" sx={{ display: 'flex' }}>
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
            <Typography component="h1" variant="h4">
              {t('documents.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('documents.description')}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Button
                fullWidth
                onClick={() => setIsAddSignplanModalOpen(true)}
                variant="outlined"
              >
                {t('documents.addSignplan')}
              </Button>
            </Box>

            <Paper
              aria-busy={isUploading}
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
                textAlign: 'center',
                transition: (theme) =>
                  theme.transitions.create([
                    'background-color',
                    'border-color',
                  ]),
              }}
              variant="outlined"
            >
              <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                <CloudUploadOutlinedIcon color="primary" fontSize="large" />
                <Typography>{t('documents.dropPrompt')}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('documents.supportedFileTypes')}
                </Typography>
                <Button
                  component="label"
                  disabled={isUploading}
                  startIcon={
                    isUploading ? <CircularProgress size={20} /> : undefined
                  }
                  variant="contained"
                >
                  {isUploading
                    ? t('documents.uploading')
                    : t('documents.upload')}
                  <input
                    accept={acceptedFileTypes}
                    hidden
                    multiple
                    onChange={handleFileSelected}
                    ref={fileInputRef}
                    type="file"
                  />
                </Button>
              </Stack>
            </Paper>
          </Stack>

          <AddSignplanModal
            onClose={() => setIsAddSignplanModalOpen(false)}
            open={isAddSignplanModalOpen}
          />

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
                    <Tooltip
                      title={t('documents.delete', { name: document.name })}
                    >
                      <IconButton
                        aria-label={t('documents.delete', {
                          name: document.name,
                        })}
                        onClick={() => handleDelete(document.uuid)}
                        sx={{
                          '&:hover': {
                            bgcolor: 'transparent',
                            color: 'error.main',
                          },
                        }}
                      >
                        <DeleteForeverIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
        <Container
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            mt: 'auto',
            pt: 3,
          }}
        >
          <Button variant="outlined">{t('navigation.back')}</Button>
          <Button variant="contained">{t('navigation.next')}</Button>
        </Container>
      </Container>
    </Box>
  );
}
