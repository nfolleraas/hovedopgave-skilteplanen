import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import {
  AppBar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
} from '@mui/material';
import { useState } from 'react';
import { routes } from '../../../app/router.js';

const navigationItems = [
  { label: 'Hjem', path: routes.home },
  { label: 'Ansøgning', path: routes.application },
  { label: 'Kontaktpersoner', path: routes.contacts },
  { label: 'Beskeder', path: routes.messages },
];

export default function Navbar() {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);
  const activeTab = navigationItems.findIndex(
    (item) => item.path === window.location.pathname,
  );

  return (
    <AppBar
      color="primary"
      component="header"
      elevation={0}
      position="static"
      sx={{ color: 'common.white' }}
    >
      <Toolbar
        sx={{
          columnGap: 2,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box
          aria-label="Ansøgningsplatformen – gå til forsiden"
          component="a"
          href={routes.home}
          sx={{ display: 'block', flexShrink: 0 }}
        >
          <Box
            alt=""
            component="img"
            src="/Logo/Logo.webp"
            sx={{
              display: 'block',
              height: 'clamp(40px, 5vw, 60px)',
              objectFit: 'cover',
              width: 'clamp(160px, 25vw, 300px)',
            }}
          />
        </Box>

        <Box
          component="nav"
          sx={{
            flex: { xs: '0 0 100%', md: '1 1 auto' },
            minWidth: 0,
            mr: { lg: 8 },
            order: { xs: 3, md: 0 },
          }}
        >
          <Tabs
            aria-label="Hovednavigation"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                color: 'common.white',
                fontWeight: 600,
                minWidth: 'auto',
                textTransform: 'none',
              },
              '& .MuiTab-root.Mui-selected': { color: 'common.white' },
              '& .MuiTabs-indicator': { backgroundColor: 'common.white' },
              '& .MuiTabs-list': { justifyContent: { md: 'center' } },
            }}
            textColor="inherit"
            value={activeTab === -1 ? false : activeTab}
            variant="scrollable"
          >
            {navigationItems.map((item) => (
              <Tab
                component="a"
                href={item.path}
                key={item.path}
                label={item.label}
              />
            ))}
          </Tabs>
        </Box>

        <IconButton
          aria-controls={menuOpen ? 'user-menu' : undefined}
          aria-expanded={menuOpen ? 'true' : undefined}
          aria-haspopup="menu"
          aria-label="Åbn brugermenu"
          color="inherit"
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={{ ml: { xs: 'auto', md: 0 } }}
        >
          <AccountCircleOutlinedIcon fontSize="large" />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          id="user-menu"
          onClose={() => setMenuAnchor(null)}
          open={menuOpen}
        >
          <MenuItem onClick={() => setMenuAnchor(null)}>Indstillinger</MenuItem>
          <MenuItem onClick={() => setMenuAnchor(null)}>Log af</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
