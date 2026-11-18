import { List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

/**
 * Renders translated administration links and marks the current page. Calls
 * onNavigate when a link is selected so the mobile drawer can close.
 */
export default function AdminSidebar({
  onNavigate,
}: AdminSidebarProps): ReactElement {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const menuItems = [
    { label: t('admin.overview'), path: '/admin' },
    { label: t('municipality.create.title'), path: '/admin/kommuner/opret' },
    { label: t('admin.users'), path: '/admin/brugere' },
    { label: t('admin.caseworkers'), path: '/admin/sagsbehandlere' },
    { label: t('navigation.settings'), path: '/admin/indstillinger' },
  ];

  return (
    <>
      <Typography sx={{ px: 2, py: 2 }} variant="h6">
        {t('admin.title')}
      </Typography>

      <List aria-label={t('admin.title')} component="nav">
        {menuItems.map((item) => (
          <ListItemButton
            aria-current={pathname === item.path ? 'page' : undefined}
            component={Link}
            key={item.path}
            onClick={onNavigate}
            selected={pathname === item.path}
            to={item.path}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}
