import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** Stand-in for the interactive map. Replace this component later. */
export function MapPlaceholder() {
  const { t } = useTranslation();

  return (
    <Box
      aria-label={t('mapStep.mapPlaceholder')}
      role="img"
      sx={{
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        border: '2px dashed #757575',
        borderRadius: 1,
        display: 'flex',
        justifyContent: 'center',
        minHeight: 300,
        p: 2,
      }}
    >
      <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
        {t('mapStep.mapPlaceholder')}
      </Typography>
    </Box>
  );
}
