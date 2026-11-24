import { Container, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import { routes } from './router.js';

/** Renders the translated fallback for routes that do not match a page. */
export function NotFoundPage() {
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

/** Renders the route layout and moves focus to the main content after supported route changes. */
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
      <Outlet />
      <Footer />
    </>
  );
}
