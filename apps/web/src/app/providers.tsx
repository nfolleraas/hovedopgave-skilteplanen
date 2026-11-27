import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';

declare module '@mui/material/styles' {
  interface TypeBackground {
    supporting: string;
  }
}

const theme = createTheme({
  palette: {
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
      supporting: '#F7F9FC',
    },
    error: { main: '#C62828' },
    primary: { main: '#1562AD', contrastText: '#FFFFFF' },
    secondary: { main: '#424242', contrastText: '#FFFFFF' },
    success: { main: '#4CAF50' },
    text: { primary: '#212121', secondary: '#616161' },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 16,
    body1: { fontSize: 16, lineHeight: 1.6 },
    body2: { fontSize: 14, lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
});

export function Providers({ children }: { children: ReactNode }): ReactElement {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
