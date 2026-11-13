import { Box, Button, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type CTAButtonProps = {
  label: string;
  icon: ReactNode;
} & ({ to: string; status?: never } | { to?: never; status: string });

/** Renders a linked application card or a status card for an unavailable option. */
export default function CTAButton({ label, to, icon, status }: CTAButtonProps) {
  const layout = {
    '& .MuiSvgIcon-root': { fontSize: '3.5rem' },
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.125rem',
    gap: 2,
    minHeight: 280,
    width: 220,
    maxWidth: '100%',
    boxSizing: 'border-box',
    lineHeight: 1.35,
    p: 3,
    textAlign: 'center',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
  } as const;

  if (!to) {
    return (
      <Paper
        elevation={0}
        sx={{
          ...layout,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        {icon}
        <Typography
          sx={{ fontSize: 'inherit', fontWeight: 600, lineHeight: 'inherit' }}
        >
          {label}
        </Typography>
        <Typography variant="body2">{status}</Typography>
      </Paper>
    );
  }

  return (
    <Button component={Link} sx={layout} to={to} variant="contained">
      {icon}
      <Box component="span">{label}</Box>
    </Button>
  );
}
