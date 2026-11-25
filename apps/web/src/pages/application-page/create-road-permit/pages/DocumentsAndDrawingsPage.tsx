import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** Shows where documents and drawings will be attached to the application. */
export function DocumentsAndDrawingsPage() {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: '#F7F9FC',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography component="h3" variant="h6">
        {t('permit.documents.heading')}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
        {t('permit.documents.placeholder')}
      </Typography>
    </Box>
  );
}
