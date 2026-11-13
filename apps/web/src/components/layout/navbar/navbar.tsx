import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, matchPath, useLocation } from 'react-router';
import { routes } from '../../../app/router.js';

/** Renders translated navigation and marks the section that contains the active route. */
export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  /** Changes the interface language and closes the user menu. */
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

  const userMenu = (
    <>
      <IconButton
        aria-controls={menuOpen ? 'user-menu' : undefined}
        aria-expanded={menuOpen ? 'true' : undefined}
        aria-haspopup="menu"
        aria-label={t('navigation.openUserMenu')}
        color="inherit"
        onClick={(event) => setMenuAnchor(event.currentTarget)}
        sx={{ minWidth: 44, minHeight: 44 }}
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
          aria-checked={currentLanguage.startsWith('da')}
          onClick={() => selectLanguage('da')}
          role="menuitemradio"
          selected={currentLanguage.startsWith('da')}
        >
          <Box
            aria-hidden="true"
            component="span"
            sx={{ fontSize: '1.25rem', mr: 1.5 }}
          >
            🇩🇰
          </Box>
          {t('navigation.danish')}
        </MenuItem>
        <MenuItem
          aria-checked={currentLanguage.startsWith('en')}
          onClick={() => selectLanguage('en')}
          role="menuitemradio"
          selected={currentLanguage.startsWith('en')}
        >
          <Box
            aria-hidden="true"
            component="span"
            sx={{ fontSize: '1.25rem', mr: 1.5 }}
          >
            🇬🇧
          </Box>
          {t('navigation.english')}
        </MenuItem>
      </Menu>
    </>
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
          sx={{
            display: 'block',
            flexShrink: 0,
          }}
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

        {!desktop && userMenu}
        <Box
          aria-label={t('navigation.main')}
          component="nav"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            minWidth: 0,
            flex: { xs: '0 0 100%', md: '1 1 auto' },
            mr: { lg: 12 },
          }}
        >
          {navigationItems.map((item, index) => (
            <Box
              aria-current={
                index === activeTab
                  ? pathname === item.path
                    ? 'page'
                    : 'location'
                  : undefined
              }
              component={Link}
              key={item.path}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 48,
                minWidth: 0,
                px: 2,
                color: 'common.white',
                fontWeight: 600,
                overflowWrap: 'anywhere',
                fontSize: '0.875rem',
                borderBottom: '2px solid',
                borderColor:
                  index === activeTab ? 'common.white' : 'transparent',
                boxSizing: 'border-box',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  textUnderlineOffset: '0.3em',
                },
              }}
              to={item.path}
            >
              {item.label}
            </Box>
          ))}
        </Box>

        {desktop && userMenu}
      </Toolbar>
    </AppBar>
  );
}
