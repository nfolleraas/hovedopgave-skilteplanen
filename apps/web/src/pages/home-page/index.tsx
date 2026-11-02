import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>Skilteplanen</h1>
      <p>Welcome to Skilteplanen.</p>
      <Button variant="contained">Hello World!</Button>
      <p>{t('test')}</p>
    </main>
  );
}
