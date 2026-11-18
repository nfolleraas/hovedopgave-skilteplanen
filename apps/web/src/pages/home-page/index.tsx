import type { ReactElement } from 'react';
//import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Renders the translated page title and welcome message on the home page.
 */
export default function HomePage(): ReactElement {
  const { t } = useTranslation();

  return (
    <main>
      <h2>{t('home.title')}</h2>
      <h2>{t('home.intro')}</h2>
    </main>
  );
}
