import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link, useMatch, useParams } from 'react-router';
import SidebarLayout from '../../components/layout/app-shell/sidebar-layout.js';
import UpdateMunicipality from './update-municipality.js';

export const caseworkerMunicipalityPath =
  '/sagsbehandler/kommuner/:municipalityId';
export const updateMunicipalityPath = `${caseworkerMunicipalityPath}/opdater`;

function focusHeading(heading: HTMLHeadingElement | null): void {
  heading?.focus();
}

export default function CaseworkerMunicipalityPage() {
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
      )}
    >
      <title>{title}</title>
      <Box sx={{ width: '100%', maxWidth: 850 }}>
        <Typography
          component="h1"
          key={`${id}-${editing}`}
          ref={focusHeading}
          sx={{ mb: 4, fontWeight: 600 }}
          tabIndex={-1}
          variant="h4"
        >
          {title}
        </Typography>
        {!validId && (
          <Alert severity="error">{t('municipality.update.loadError')}</Alert>
        )}
        {validId && editing && (
          <UpdateMunicipality key={id} municipalityId={id} />
        )}
      </Box>
    </SidebarLayout>
  );
}
