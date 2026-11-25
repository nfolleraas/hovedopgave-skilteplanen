import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** Renders the translated home page with a heading that receives focus after navigation. */
export default function HomePage() {
  const { t } = useTranslation();
  return (
    <Box
      component="main"
      id="main-content"
      sx={{ textAlign: 'center' }}
      tabIndex={-1}
    >
      <title>{`${t('home.title')} | ${t('common.brandName')}`}</title>
      <h1 data-route-heading="" tabIndex={-1}>
        {t('home.title')}
      </h1>
      <Box
        component="p"
        sx={{ fontSize: '1.5em', fontWeight: 700, my: '0.83em' }}
      >
        {t('home.intro')}
      </Box>
    </Box>
  );
}
