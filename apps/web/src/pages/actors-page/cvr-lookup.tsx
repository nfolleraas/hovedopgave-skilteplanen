import { Box, Button, TextField } from '@mui/material';

interface CvrLookupProps {
  value: string;
  disabled?: boolean;
  loading: boolean;
  error?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

export function CvrLookup({
  value,
  disabled,
  loading,
  error,
  onChange,
  onConfirm,
}: CvrLookupProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <TextField
        autoComplete="off"
        disabled={disabled}
        error={Boolean(error)}
        fullWidth
        helperText={
          error ??
          'Bekræft CVR-nummeret for at hente virksomhedens oplysninger.'
        }
        label="CVR-nummer"
        name="cvrNumber"
        onChange={(event) => onChange(event.target.value)}
        required
        size="small"
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
        value={value}
      />
      <Button
        disabled={disabled || loading || !/^\d{8}$/.test(value.trim())}
        loading={loading}
        onClick={onConfirm}
        sx={{ flexShrink: 0, minHeight: 40, whiteSpace: 'nowrap' }}
        type="button"
        variant="outlined"
      >
        Søg
      </Button>
    </Box>
  );
}
