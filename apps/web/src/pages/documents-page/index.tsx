import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useSearchParams } from 'react-router';
import { routes } from '../../app/router.js';
import DocumentsManager from './components/documents-manager.js';

/** Renders the standalone document-management page for one application. */
export default function DocumentsPage() {
  const { i18n, t } = useTranslation();
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('draft');
  const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('da')
    ? 'da'
    : 'en';

  useEffect(() => {
    const previousTitle = document.title;
    document.documentElement.lang = language;
    document.title = `${t('documents.title')} – ${t('common.brandName')}`;
    pageTitleRef.current?.focus();

    return () => {
      document.title = previousTitle;
    };
  }, [language, t]);

  if (!applicationId) {
    return <Navigate replace to={routes.application} />;
  }

  return (
    <Box component="main" id="main-content" sx={{ display: 'flex' }}>
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          py: { xs: 4, sm: 8 },
        }}
      >
        <Stack spacing={3}>
          <Typography
            component="h1"
            data-route-heading=""
            ref={pageTitleRef}
            sx={{ fontSize: 'clamp(1.75rem, 5vw, 2.125rem)' }}
            tabIndex={-1}
            variant="h4"
          >
            {t('documents.title')}
          </Typography>

          <DocumentsManager applicationId={applicationId} />
        </Stack>

        <Stack
          aria-label={t('documents.pageNavigation')}
          component="nav"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'center',
            mt: 'auto',
            pt: 3,
          }}
        >
          <Button
            color="secondary"
            component={Link}
            to={routes.application}
            variant="contained"
          >
            {t('navigation.back')}
          </Button>
          <Button component={Link} to={routes.contacts} variant="contained">
            {t('navigation.next')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
