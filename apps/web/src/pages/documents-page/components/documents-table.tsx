import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DeleteConfirmationDialog from '../../../components/ui/dialogs/delete-confirmation-dialog.js';
import UrlPreviewDialog from '../../../components/ui/dialogs/url-preview-dialog.js';
import {
  formatReadableDate,
  formatReadableTime,
} from '../../../utils/format-date.js';
import type { Document, DocumentType } from '../document.types.js';
import type { DocumentsState } from '../hooks/use-documents.js';

type DocumentsTableProps = {
  documentsState: Pick<
    DocumentsState,
    'documents' | 'error' | 'isLoading' | 'loadStatusMessage' | 'removeDocument'
  >;
  headingLevel?: 'h2' | 'h3' | 'h4';
};

type SortColumn = 'name' | 'documentType' | 'date';
type SortDirection = 'asc' | 'desc';

/**
 * Renders document loading, empty, error, preview, and deletion states in responsive layouts.
 * @param props - The shared document state and required heading level
 * @returns The complete responsive document collection
 */
export default function DocumentsTable({
  documentsState,
  headingLevel = 'h2',
}: DocumentsTableProps) {
  const { i18n, t } = useTranslation();
  const { documents, error, isLoading, loadStatusMessage, removeDocument } =
    documentsState;
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(
    null,
  );
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const itemHeadingLevel = {
    h2: 'h3',
    h3: 'h4',
    h4: 'h5',
  }[headingLevel] as 'h3' | 'h4' | 'h5';

  useEffect(() => {
    if (statusMessage) titleRef.current?.focus();
  }, [statusMessage]);

  const documentTypeLabels = useMemo<Record<DocumentType, string>>(
    () => ({
      Other: t('documents.documentTypes.other'),
      SignPlan: t('documents.documentTypes.signPlan'),
    }),
    [t],
  );

  const sortedDocuments = useMemo(() => {
    const collator = new Intl.Collator(i18n.resolvedLanguage, {
      numeric: true,
      sensitivity: 'base',
    });

    return [...documents].sort((first, second) => {
      let comparison: number;

      if (sortColumn === 'date') {
        comparison = Date.parse(first.date) - Date.parse(second.date);
      } else if (sortColumn === 'documentType') {
        comparison = collator.compare(
          documentTypeLabels[first.documentType],
          documentTypeLabels[second.documentType],
        );
      } else {
        comparison = collator.compare(first.name, second.name);
      }

      if (comparison === 0) {
        comparison = collator.compare(first.uuid, second.uuid);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [
    documents,
    documentTypeLabels,
    i18n.resolvedLanguage,
    sortColumn,
    sortDirection,
  ]);

  /**
   * Selects a sort column or reverses the active column's direction.
   * @param column - The document field to sort by
   */
  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((currentDirection) =>
        currentDirection === 'asc' ? 'desc' : 'asc',
      );
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}
      {statusMessage && (
        <Alert
          onClose={() => setStatusMessage(null)}
          role="status"
          severity="success"
        >
          {statusMessage}
        </Alert>
      )}
      {documentToDelete && (
        <DeleteConfirmationDialog
          endpoint={`/documents/${documentToDelete.uuid}`}
          entityName={documentToDelete.name}
          onClose={() => setDocumentToDelete(null)}
          onDeleted={() => {
            removeDocument(documentToDelete.uuid);
            setStatusMessage(
              t('documents.deleteSuccess', { name: documentToDelete.name }),
            );
          }}
          open
        />
      )}

      <Paper
        aria-busy={isLoading}
        aria-labelledby={titleId}
        component="section"
        elevation={1}
        sx={{ overflow: 'hidden' }}
      >
        <Typography
          component={headingLevel}
          id={titleId}
          ref={titleRef}
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
          <>
            <Box
              aria-labelledby={titleId}
              component="ul"
              sx={{
                display: { xs: 'grid', md: 'none' },
                gap: 2,
                listStyle: 'none',
                m: 0,
                p: { xs: 2, sm: 3 },
                pt: 0,
              }}
            >
              {sortedDocuments.map((document) => (
                <Paper
                  component="li"
                  key={document.uuid}
                  sx={{ minWidth: 0, p: 2 }}
                  variant="outlined"
                >
                  <Stack spacing={2}>
                    <Typography
                      component={itemHeadingLevel}
                      sx={{ overflowWrap: 'anywhere' }}
                      variant="subtitle1"
                    >
                      <Link
                        aria-label={t('documents.openPreview', {
                          name: document.name,
                        })}
                        component="button"
                        onClick={() => setDocumentToPreview(document)}
                        sx={{ font: 'inherit', textAlign: 'left' }}
                        type="button"
                      >
                        {document.name}
                      </Link>
                    </Typography>

                    <Box
                      component="dl"
                      sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns:
                          'minmax(7rem, auto) minmax(0, 1fr)',
                        m: 0,
                      }}
                    >
                      <Typography
                        component="dt"
                        sx={{ fontWeight: 600 }}
                        variant="body2"
                      >
                        {t('documents.table.documentType')}
                      </Typography>
                      <Typography component="dd" sx={{ m: 0 }} variant="body2">
                        {documentTypeLabels[document.documentType]}
                      </Typography>

                      <Typography
                        component="dt"
                        sx={{ fontWeight: 600 }}
                        variant="body2"
                      >
                        {t('documents.table.createdAt')}
                      </Typography>
                      <Box component="dd" sx={{ m: 0, minWidth: 0 }}>
                        <Stack
                          component="time"
                          dateTime={document.date}
                          spacing={0.25}
                        >
                          <Typography component="span" variant="body2">
                            {formatReadableDate(document.date)}
                          </Typography>
                          <Typography component="span" variant="caption">
                            {formatReadableTime(document.date)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>

                    <Button
                      aria-label={t('documents.delete', {
                        name: document.name,
                      })}
                      color="error"
                      onClick={() => {
                        setStatusMessage(null);
                        setDocumentToDelete(document);
                      }}
                      sx={{ alignSelf: 'flex-end' }}
                      variant="outlined"
                    >
                      {t('documents.deleteAction')}
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Box>

            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table aria-labelledby={titleId} sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sortDirection={
                        sortColumn === 'name' ? sortDirection : false
                      }
                      sx={{ width: '35%' }}
                    >
                      <TableSortLabel
                        active={sortColumn === 'name'}
                        direction={
                          sortColumn === 'name' ? sortDirection : 'asc'
                        }
                        onClick={() => handleSort('name')}
                      >
                        {t('documents.table.name')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sortDirection={
                        sortColumn === 'documentType' ? sortDirection : false
                      }
                      sx={{ width: '20%' }}
                    >
                      <TableSortLabel
                        active={sortColumn === 'documentType'}
                        direction={
                          sortColumn === 'documentType' ? sortDirection : 'asc'
                        }
                        onClick={() => handleSort('documentType')}
                      >
                        {t('documents.table.documentType')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell
                      sortDirection={
                        sortColumn === 'date' ? sortDirection : false
                      }
                      sx={{ width: '25%' }}
                    >
                      <TableSortLabel
                        active={sortColumn === 'date'}
                        direction={
                          sortColumn === 'date' ? sortDirection : 'asc'
                        }
                        onClick={() => handleSort('date')}
                      >
                        {t('documents.table.createdAt')}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>
                      {t('documents.table.actions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDocuments.map((document) => (
                    <TableRow key={document.uuid}>
                      <TableCell
                        component="th"
                        scope="row"
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        <Link
                          aria-label={t('documents.openPreview', {
                            name: document.name,
                          })}
                          component="button"
                          onClick={() => setDocumentToPreview(document)}
                          sx={{ font: 'inherit', textAlign: 'left' }}
                          type="button"
                        >
                          {document.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {documentTypeLabels[document.documentType]}
                      </TableCell>
                      <TableCell>
                        <Stack
                          component="time"
                          dateTime={document.date}
                          spacing={0.25}
                        >
                          <Typography component="span" variant="body2">
                            {formatReadableDate(document.date)}
                          </Typography>
                          <Typography component="span" variant="caption">
                            {formatReadableTime(document.date)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          aria-label={t('documents.delete', {
                            name: document.name,
                          })}
                          color="error"
                          onClick={() => {
                            setStatusMessage(null);
                            setDocumentToDelete(document);
                          }}
                          variant="outlined"
                        >
                          {t('documents.deleteAction')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {documentToPreview && (
              <UrlPreviewDialog
                onClose={() => setDocumentToPreview(null)}
                title={t('documents.previewTitle', {
                  name: documentToPreview.name,
                })}
                url={documentToPreview.url}
              />
            )}
          </>
        )}
      </Paper>
    </Stack>
  );
}
