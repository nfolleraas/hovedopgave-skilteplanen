import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Renders the localized home page.
 * @returns The home page UI
 */
export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main>
      <h2>{t('home.title')}</h2>
      <h2>{t('home.intro')}</h2>
    </main>
  );
}
