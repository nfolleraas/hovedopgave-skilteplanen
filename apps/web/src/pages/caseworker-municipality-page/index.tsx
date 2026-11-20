import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useMatch, useParams } from 'react-router';
import SidebarLayout from '../../components/layout/app-shell/sidebar-layout.js';
import UpdateMunicipality from './update-municipality.js';

export const caseworkerMunicipalityPath =
  '/sagsbehandler/kommuner/:municipalityId';
export const updateMunicipalityPath = `${caseworkerMunicipalityPath}/opdater`;

/**
 * Focuses the heading when a different page or municipality is shown so
 * keyboard and screen reader users have the new page context.
 */
function focusHeading(heading: HTMLHeadingElement | null): void {
  heading?.focus();
}

/**
 * Renders the caseworker sidebar and shows the edit form on the update route.
 * The route supplies the municipality ID for use before login is integrated.
 */
export default function CaseworkerMunicipalityPage(): ReactElement {
  const { t } = useTranslation();
  const { municipalityId } = useParams();
  const editing = Boolean(useMatch(updateMunicipalityPath));
  const id = Number(municipalityId);
  const validId =
    /^\d+$/.test(municipalityId ?? '') && id > 0 && id <= 2147483647;
  const title = editing
    ? t('municipality.update.title')
    : t('caseworker.title');
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
          </List>
        </>
      )}
    >
      <title>{title}</title>
      <Box sx={{ width: '100%', maxWidth: 850 }}>
        <Typography
          component="h1"
          key={`${id}-${editing}`}
          ref={focusHeading}
          sx={{ mb: 4, fontWeight: 600, outline: 'none' }}
          tabIndex={-1}
          variant="h4"
        >
          {title}
        </Typography>
        {!validId && (
          <Alert severity="error">{t('municipality.update.loadError')}</Alert>
        )}
        {validId && (
          <UpdateMunicipality editing={editing} key={id} municipalityId={id} />
        )}
      </Box>
    </SidebarLayout>
  );
}
