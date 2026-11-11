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
  Typography,
} from '@mui/material';
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

export default function DocumentsTable({
  documents,
  labelledBy,
  onDelete,
}: DocumentsTableProps) {
  const { t } = useTranslation();

  const documentTypeLabels: Record<DocumentType, string> = {
    Other: t('documents.documentTypes.other'),
    SignPlan: t('documents.documentTypes.signPlan'),
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
        {documents.map((document) => (
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
              <TableCell sx={{ width: '35%' }}>
                {t('documents.table.name')}
              </TableCell>
              <TableCell sx={{ width: '20%' }}>
                {t('documents.table.documentType')}
              </TableCell>
              <TableCell sx={{ width: '25%' }}>
                {t('documents.table.createdAt')}
              </TableCell>
              <TableCell align="right" sx={{ width: '20%' }}>
                {t('documents.table.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => (
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
