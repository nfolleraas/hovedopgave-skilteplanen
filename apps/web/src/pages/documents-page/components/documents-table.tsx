import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  Box,
  Button,
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
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatReadableDate,
  formatReadableTime,
} from '../../../utils/format-date.js';
import type { Document, DocumentType } from '../document.types.js';

type DocumentsTableProps = {
  documents: Document[];
  labelledBy: string;
  onDelete: (document: Document) => void;
};

type SortColumn = 'name' | 'documentType' | 'date';
type SortDirection = 'asc' | 'desc';

export default function DocumentsTable({
  documents,
  labelledBy,
  onDelete,
}: DocumentsTableProps) {
  const { i18n, t } = useTranslation();
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
    <>
      <Box
        aria-labelledby={labelledBy}
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
                component="h3"
                sx={{ overflowWrap: 'anywhere' }}
                variant="subtitle1"
              >
                <Link
                  aria-label={t('documents.openDocumentInNewTab', {
                    name: document.name,
                  })}
                  href={document.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {document.name}
                </Link>
              </Typography>

              <Box
                component="dl"
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: 'minmax(7rem, auto) minmax(0, 1fr)',
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
                aria-label={t('documents.delete', { name: document.name })}
                color="error"
                onClick={() => onDelete(document)}
                startIcon={<DeleteOutlinedIcon />}
                sx={{ alignSelf: 'flex-end' }}
                variant="text"
              >
                {t('documents.deleteAction')}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Box>

      <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table aria-labelledby={labelledBy} sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell
                sortDirection={sortColumn === 'name' ? sortDirection : false}
                sx={{ width: '35%' }}
              >
                <TableSortLabel
                  active={sortColumn === 'name'}
                  direction={sortColumn === 'name' ? sortDirection : 'asc'}
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
                sortDirection={sortColumn === 'date' ? sortDirection : false}
                sx={{ width: '25%' }}
              >
                <TableSortLabel
                  active={sortColumn === 'date'}
                  direction={sortColumn === 'date' ? sortDirection : 'asc'}
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
                    aria-label={t('documents.openDocumentInNewTab', {
                      name: document.name,
                    })}
                    href={document.url}
                    rel="noopener noreferrer"
                    target="_blank"
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
                    onClick={() => onDelete(document)}
                    startIcon={<DeleteOutlinedIcon />}
                    variant="text"
                  >
                    {t('documents.deleteAction')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
