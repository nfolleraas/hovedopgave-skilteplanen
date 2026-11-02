import { Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import { pages } from './router.js';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main>
      <Container sx={{ py: 8 }}>
        <Typography component="h1" variant="h4">
          {t('notFound.title')}
        </Typography>
      </Container>
    </main>
  );
}

export default function App() {
  const CurrentPage = pages[window.location.pathname] ?? NotFoundPage;

  return (
    <>
      <Navbar />
      <CurrentPage />
      <Footer />
    </>
  );
}
