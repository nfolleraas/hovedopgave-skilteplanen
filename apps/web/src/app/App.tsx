import { Container, Typography } from '@mui/material';
import { type ReactElement, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, Outlet, useLocation } from 'react-router';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import { routes } from './router.js';

/** Renders the translated fallback for routes that do not match a page. */
export function NotFoundPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <main id="main-content" tabIndex={-1}>
      <Container sx={{ py: 8 }}>
        <Typography component="h1" variant="h4">
          {t('notFound.title')}
        </Typography>
      </Container>
    </main>
  );
}

/** Renders the shared layout and focuses content after supported route changes. */
export default function App(): ReactElement {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const isActorRoute =
    pathname !== routes.createRoadPermit &&
    [
      routes.selectedApplication,
      `${routes.selectedApplication}/actors/create`,
      `${routes.selectedApplication}/actors/:uuid/edit`,
      `${routes.application}/actors/create`,
      `${routes.application}/actors/:uuid/edit`,
    ].some((path) => matchPath(path, pathname));
  const hasSkipTarget =
    pathname === routes.home ||
    pathname === routes.application ||
    pathname === routes.createRoadPermit ||
    isActorRoute;

  useEffect(() => {
    // Actor layouts manage their own heading focus.
    if (previousPath.current !== pathname && hasSkipTarget && !isActorRoute) {
      const main = document.getElementById('main-content');
      (
        main?.querySelector<HTMLElement>('[data-route-heading]') ?? main
      )?.focus();
    }
    previousPath.current = pathname;
  }, [hasSkipTarget, isActorRoute, pathname]);

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
