import { Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Route, Routes, useLocation } from 'react-router';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import { pages, routes } from './router.js';

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
  const location = useLocation();

  const isCreateApplicantPage =
    location.pathname === routes.createPrivateApplicant ||
    location.pathname === routes.createBusinessApplicant;
  return (
    <>
      {!isCreateApplicantPage && <Navbar />}

      <Routes>
        {Object.entries(pages).map(([path, Page]) => (
          <Route element={<Page />} key={path} path={path} />
        ))}
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
      {!isCreateApplicantPage && <Footer />}
    </>
  );
}
