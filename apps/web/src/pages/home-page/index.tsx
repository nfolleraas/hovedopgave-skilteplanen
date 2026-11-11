import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main id="main-content" tabIndex={-1}>
      <h2>{t('home.title')}</h2>
      <h2>{t('home.intro')}</h2>
    </main>
  );
}
