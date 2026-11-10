import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { AppBar, Box, Button, Tab, Tabs, Toolbar } from '@mui/material';
import { Link, matchPath, useLocation } from 'react-router';
import { routes } from '../../../app/router.js';

export default function Navbar() {
  const { pathname } = useLocation();
  const navigationItems = [
    { label: 'Dashboard', path: routes.home },
    { label: 'Ansøgning', path: routes.application },
  ];
  const activeTab = navigationItems.findIndex(
    (item) =>
      matchPath(
        { path: item.path, end: item.path === routes.home },
        pathname,
      ) !== null,
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
          columnGap: { xs: 1, md: 3 },
          minHeight: 72,
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box
          aria-label="Gå til dashboard"
          component={Link}
          sx={{ display: 'block', flexShrink: 0 }}
          to={routes.home}
        >
          <Box
            alt="Skilteplanen"
            component="img"
            src="/Logo/Logo.webp"
            sx={{
              display: 'block',
              height: 42,
              objectFit: 'contain',
              width: { xs: 150, sm: 190 },
            }}
          />
        </Box>

        <Box component="nav" sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Tabs
            aria-label="Hovednavigation"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                borderRadius: 1,
                color: 'common.white',
                fontWeight: 600,
                minWidth: 'auto',
                px: { xs: 1.5, sm: 2 },
                textTransform: 'none',
              },
              '& .MuiTab-root.Mui-selected': {
                bgcolor: 'rgba(255, 255, 255, 0.16)',
                color: 'common.white',
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
            textColor="inherit"
            value={activeTab === -1 ? false : activeTab}
            variant="scrollable"
          >
            {navigationItems.map((item) => (
              <Tab
                component={Link}
                key={item.path}
                label={item.label}
                to={item.path}
              />
            ))}
          </Tabs>
        </Box>

        <Button
          color="inherit"
          endIcon={<KeyboardArrowDownIcon />}
          startIcon={<AccountCircleOutlinedIcon />}
          sx={{
            '& .MuiButton-startIcon': { mr: 0.75 },
            color: 'common.white',
            flexShrink: 0,
            fontWeight: 600,
            minWidth: 'auto',
            px: { xs: 0.5, sm: 1 },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Profil
          </Box>
        </Button>
      </Toolbar>
    </AppBar>
  );
}
