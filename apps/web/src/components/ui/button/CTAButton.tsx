import { Box, Button } from '@mui/material';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type CTAButtonProps = {
  label: string;
  to: string;
  icon: ReactNode;
};

export default function CTAButton({ label, to, icon }: CTAButtonProps) {
  return (
    <Button
      component={Link}
      size="large"
      sx={{
        '& .MuiSvgIcon-root': { fontSize: '3.5rem' },
        flexDirection: 'column',
        fontSize: '1.125rem',
        gap: 2,
        height: 280,
        lineHeight: 1.35,
        maxWidth: '100%',
        p: 3,
        textAlign: 'center',
        whiteSpace: 'normal',
        width: 220,
      }}
      to={to}
      variant="contained"
    >
      {icon}
      <Box component="span" sx={{ overflowWrap: 'anywhere' }}>
        {label}
      </Box>
    </Button>
  );
}
