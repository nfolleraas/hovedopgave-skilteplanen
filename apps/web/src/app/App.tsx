import { Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import { pages } from './router.js';

/**
 * Renders the fallback page for unmatched routes.
 * @returns The localized not-found page
 */
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

/**
 * Renders the shared application layout and route configuration.
 * @returns The application UI
 */
export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {Object.entries(pages).map(([path, Page]) => (
          <Route element={<Page />} key={path} path={path} />
        ))}
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
      <Footer />
    </>
  );
}
