import { List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { Link, useLocation } from 'react-router';

const menuItems = [
  { label: 'Oversigt', path: '/admin' },
  { label: 'Opret Kommuner', path: '/admin/kommuner/opret' },
  { label: 'Brugere', path: '/admin/brugere' },
  { label: 'Sagsbehandlere', path: '/admin/sagsbehandlere' },
  { label: 'Indstillinger', path: '/admin/indstillinger' },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <>
      <Typography sx={{ px: 2, py: 2 }} variant="h6">
        Administration
      </Typography>

      <List component="nav">
        {menuItems.map((item) => (
          <ListItemButton
            component={Link}
            key={item.path}
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
