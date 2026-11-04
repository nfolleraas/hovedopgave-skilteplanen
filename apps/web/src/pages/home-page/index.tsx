import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <Box component="main" sx={{ textAlign: 'center', alignItems:"center" }}>
      <h1>{t('home.title')}</h1>
      <h2>{t('home.intro')}</h2>
    </Box>
  );
}
