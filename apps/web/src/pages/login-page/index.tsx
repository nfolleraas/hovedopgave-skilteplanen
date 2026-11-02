import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t('login.title')}</h1>
      <p>{t('login.formPlaceholder')}</p>
    </main>
  );
}
