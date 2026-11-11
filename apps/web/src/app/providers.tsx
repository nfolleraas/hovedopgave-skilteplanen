import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';

declare module '@mui/material/styles' {
  interface TypeBackground {
    muted: string;
    supporting: string;
  }

  interface Theme {
    gradients: {
      hero: string;
    };
  }

  interface ThemeOptions {
    gradients?: {
      hero?: string;
    };
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    headerSignup: true;
    homepageSignup: true;
  }
}

const theme = createTheme({
  components: {
    MuiButton: {
      variants: [
        {
          props: { variant: 'headerSignup' },
          style: {
            backgroundColor: '#FFFFFF',
            color: '#1562AD',
            '&:hover': { backgroundColor: '#F5F5F5' },
          },
        },
        {
          props: { variant: 'homepageSignup' },
          style: {
            backgroundColor: '#FFD700',
            borderRadius: 6,
            color: '#15324F',
          },
        },
      ],
    },
  },
  gradients: {
    hero: 'linear-gradient(to right, #124B7A, #1C68AD)',
  },
  palette: {
    background: {
      default: '#FFFFFF',
      muted: '#F5F5F5',
      paper: '#FFFFFF',
      supporting: '#F7F9FC',
    },
    error: { main: '#F44336' },
    primary: { main: '#1562AD', contrastText: '#FFFFFF' },
    secondary: { main: '#424242', contrastText: '#FFFFFF' },
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
    caption: { color: palette.text.secondary, fontSize: 12 },
  }),
});

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
