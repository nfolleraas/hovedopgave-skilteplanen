import { List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

const menuItems = [
  { label: 'admin.overview', path: '/admin' },
  { label: 'municipality.create.title', path: '/admin/kommuner/opret' },
  { label: 'admin.users', path: '/admin/brugere' },
  { label: 'admin.caseworkers', path: '/admin/sagsbehandlere' },
  { label: 'navigation.settings', path: '/admin/indstillinger' },
];

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

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
            <ListItemText primary={t(item.label)} />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}
