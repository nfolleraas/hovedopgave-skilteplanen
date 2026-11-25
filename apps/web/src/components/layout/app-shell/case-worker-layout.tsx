import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import SidebarLayout from './sidebar-layout.js';

export const caseworkerMunicipalityPath =
  '/sagsbehandler/kommuner/:municipalityId';
export const caseWorkerListPath = `${caseworkerMunicipalityPath}/sagsbehandlere`;
export const updateMunicipalityPath = `${caseworkerMunicipalityPath}/opdater`;

/**
 * Focuses the heading when a different page or municipality is shown so
 * keyboard and screen reader users have the new page context.
 */
function focusHeading(heading: HTMLHeadingElement | null): void {
  heading?.focus();
}

interface CaseWorkerLayoutProps {
  title: string;
  section: 'municipality' | 'municipalityEdit' | 'caseWorkers';
  renderContent: (municipalityId: number) => ReactNode;
}

/** Renders the shared sidebar and supplies a valid municipality ID to the page. */
export default function CaseWorkerLayout({
  title,
  section,
  renderContent,
}: CaseWorkerLayoutProps): ReactElement {
  const { t } = useTranslation();
  const { municipalityId } = useParams();
  const editing = section === 'municipalityEdit';
  const listing = section === 'caseWorkers';
  const id = Number(municipalityId);
  const validId =
    /^\d+$/.test(municipalityId ?? '') && id > 0 && id <= 2147483647;
  const listPath = `/sagsbehandler/kommuner/${id}/sagsbehandlere`;
  const editPath = `/sagsbehandler/kommuner/${id}/opdater`;

  return (
    <SidebarLayout
      menuLabel={t('caseworker.openMenu')}
      renderSidebar={(onNavigate) => (
        <>
          <Typography sx={{ px: 2, py: 2 }} variant="h6">
            {t('caseworker.title')}
          </Typography>

          <List aria-label={t('caseworker.title')} component="nav">
            {validId && (
              <ListItemButton
                aria-current={editing ? 'page' : undefined}
                component={Link}
                onClick={onNavigate}
                selected={editing}
                to={editPath}
              >
                <ListItemText primary={t('municipality.update.title')} />
              </ListItemButton>
            )}
            {validId && (
              <ListItemButton
                aria-current={listing ? 'page' : undefined}
                component={Link}
                onClick={onNavigate}
                selected={listing}
                to={listPath}
              >
                <ListItemText primary={t('caseworker.management.title')} />
              </ListItemButton>
            )}
          </List>
        </>
      )}
    >
      <title>{title}</title>
      <Box sx={{ width: '100%', maxWidth: 850 }}>
        <Typography
          component="h1"
          key={`${id}-${title}`}
          ref={focusHeading}
          sx={{
            mb: 4,
            fontWeight: 600,
            '#root &:focus-visible': { outline: 'none', boxShadow: 'none' },
          }}
          tabIndex={-1}
          variant="h4"
        >
          {title}
        </Typography>
        {!validId && (
          <Alert severity="error">
            {listing
              ? t('caseworker.management.loadError')
              : t('municipality.update.loadError')}
          </Alert>
        )}
        {validId && renderContent(id)}
      </Box>
    </SidebarLayout>
  );
}
