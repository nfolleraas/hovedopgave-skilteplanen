import { Container, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
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
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const hasSkipTarget =
    pathname === routes.home ||
    pathname === routes.application ||
    pathname === routes.createRoadPermit;

  useEffect(() => {
    if (previousPath.current !== pathname && hasSkipTarget) {
      const main = document.getElementById('main-content');
      (
        main?.querySelector<HTMLElement>('[data-route-heading]') ?? main
      )?.focus();
    }
    previousPath.current = pathname;
  }, [hasSkipTarget, pathname]);

  return (
    <>
      {hasSkipTarget && (
        <a className="skip-link" href="#main-content">
          {t('navigation.skipToMain')}
        </a>
      )}
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
