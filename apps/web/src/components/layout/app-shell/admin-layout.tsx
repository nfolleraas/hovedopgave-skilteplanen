import MenuIcon from '@mui/icons-material/Menu';
import { Box, Button, Drawer, Paper } from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import AdminSidebar from '../sidebar/sidebar.js';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: 'calc(100vh - 120px)',
        width: '100%',
      }}
    >
      {/* Desktop sidebar */}
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
        <AdminSidebar />
      </Paper>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {/* Mobile menu button */}
        <Button
          onClick={() => setMenuOpen(true)}
          startIcon={<MenuIcon />}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 2 }}
        >
          Menu
        </Button>

        {children}
      </Box>

      {/* Mobile sidebar */}
      <Drawer
        anchor="left"
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box
          key={location.pathname}
          onClick={() => setMenuOpen(false)}
          sx={{ width: 260, pt: 2 }}
        >
          <AdminSidebar />
        </Box>
      </Drawer>
    </Box>
  );
}
