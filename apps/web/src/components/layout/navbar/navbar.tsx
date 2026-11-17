import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Toolbar,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, useLocation } from 'react-router';
import { routes } from '../../../app/router.js';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const selectLanguage = (language: 'en' | 'da') => {
    void i18n.changeLanguage(language);
    setMenuAnchor(null);
  };
  const navigationItems = [
    { label: t('navigation.home'), path: routes.home },
    { label: t('navigation.application'), path: routes.application },
    { label: t('navigation.messages'), path: routes.messages },
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
          columnGap: 2,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box
          aria-label={t('navigation.logoHome')}
          component={Link}
          sx={{ display: 'block', flexShrink: 0 }}
          to={routes.home}
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
            mr: { lg: 12 },
            order: { xs: 3, md: 0 },
          }}
        >
          <Tabs
            aria-label={t('navigation.main')}
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
              '& .MuiTabs-list': { justifyContent: 'flex-start' },
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

        <IconButton
          aria-controls={menuOpen ? 'user-menu' : undefined}
          aria-expanded={menuOpen ? 'true' : undefined}
          aria-haspopup="menu"
          aria-label={t('navigation.openUserMenu')}
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
          <MenuItem onClick={() => setMenuAnchor(null)}>
            {t('navigation.settings')}
          </MenuItem>
          <MenuItem onClick={() => setMenuAnchor(null)}>
            {t('navigation.logOut')}
          </MenuItem>
          <Divider />
          <ListSubheader>{t('navigation.language')}</ListSubheader>
          <MenuItem
            onClick={() => selectLanguage('da')}
            selected={currentLanguage.startsWith('da')}
          >
            <Box
              aria-hidden="true"
              component="span"
              sx={{ fontSize: '1.25rem', mr: 1.5 }}
            >
              🇩🇰
            </Box>
          </MenuItem>
          <MenuItem
            onClick={() => selectLanguage('en')}
            selected={currentLanguage.startsWith('en')}
          >
            <Box
              aria-hidden="true"
              component="span"
              sx={{ fontSize: '1.25rem', mr: 1.5 }}
            >
              🇬🇧
            </Box>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
