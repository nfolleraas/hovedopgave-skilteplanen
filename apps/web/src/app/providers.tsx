import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    error: { main: '#F44336' },
    primary: { main: '#1562AD', contrastText: '#FFFFFF' },
    success: { main: '#4CAF50' },
    text: { primary: '#212121', secondary: '#757575' },
  },
  shape: { borderRadius: 4 },
  typography: (palette) => ({
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 16,
    body1: { fontSize: 16, lineHeight: 1.6 },
    body2: { fontSize: 14, lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none' },
    caption: { fontSize: 12, color: palette.text.secondary }
  }),
});

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
