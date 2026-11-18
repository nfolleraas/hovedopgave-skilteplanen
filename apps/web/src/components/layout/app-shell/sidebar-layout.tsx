import MenuIcon from '@mui/icons-material/Menu';
import { Box, Button, Drawer, Paper } from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SidebarLayoutProps {
  children: ReactNode;
  menuLabel: string;
  renderSidebar: (onNavigate?: () => void) => ReactNode;
}

export default function SidebarLayout({
  children,
  menuLabel,
  renderSidebar,
}: SidebarLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: 'calc(100vh - 120px)',
        width: '100%',
      }}
    >
      <Button
        component="a"
        href="#sidebar-main"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          transform: 'translateY(-110%)',
          '&:focus': { transform: 'none' },
        }}
        variant="contained"
      >
        {t('navigation.skipToContent')}
      </Button>

      <Paper
        component="aside"
        elevation={0}
        square
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 240,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          p: 2,
        }}
      >
        {renderSidebar()}
      </Paper>

      <Box
        component="main"
        id="sidebar-main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, sm: 3, md: 4 },
        }}
        tabIndex={-1}
      >
        <Button
          onClick={() => setMenuOpen(true)}
          startIcon={<MenuIcon />}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 2 }}
        >
          {menuLabel}
        </Button>

        {children}
      </Box>

      <Drawer
        anchor="left"
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box sx={{ width: 260, pt: 2 }}>
          {renderSidebar(() => setMenuOpen(false))}
        </Box>
      </Drawer>
    </Box>
  );
}
