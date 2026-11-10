import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import {
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  formatReadableDate,
  formatReadableTime,
} from '../../utils/format-date.js';
import type { Document, DocumentType } from './document.types.js';

type DocumentsTableProps = {
  documents: Document[];
  onDelete: (document: Document) => void;
};

const documentTypeTranslationKeys: Record<DocumentType, string> = {
  Other: 'documents.documentTypes.other',
  SignPlan: 'documents.documentTypes.signPlan',
};

export default function DocumentsTable({
  documents,
  onDelete,
}: DocumentsTableProps) {
  const { t } = useTranslation();

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('documents.table.name')}</TableCell>
            <TableCell>{t('documents.table.documentType')}</TableCell>
            <TableCell>{t('documents.table.createdAt')}</TableCell>
            <TableCell align="right">{t('documents.table.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.uuid}>
              <TableCell component="th" scope="row">
                <Link href={document.url} rel="noreferrer" target="_blank">
                  {document.name}
                </Link>
              </TableCell>
              <TableCell>
                {t(documentTypeTranslationKeys[document.documentType])}
              </TableCell>
              <TableCell>
                <Stack spacing={0.25}>
                  <Typography variant="body2">
                    {formatReadableDate(document.date)}
                  </Typography>
                  <Typography variant="caption">
                    {formatReadableTime(document.date)}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Tooltip title={t('documents.delete', { name: document.name })}>
                  <IconButton
                    aria-label={t('documents.delete', {
                      name: document.name,
                    })}
                    onClick={() => onDelete(document)}
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
