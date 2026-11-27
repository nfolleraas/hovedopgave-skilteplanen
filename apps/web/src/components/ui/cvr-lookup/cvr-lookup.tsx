import { Box, Button, TextField } from '@mui/material';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface CvrLookupProps {
  value: string;
  disabled?: boolean;
  loading: boolean;
  error?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
}

/**
 * Renders a CVR input with search-button and Enter-key confirmation when its
 * eight-digit value is valid and lookup is available.
 * @param props - CVR value, lookup state, and change and confirmation
 *   callbacks
 * @returns The CVR input and lookup button
 */
export function CvrLookup({
  value,
  disabled,
  loading,
  error,
  onChange,
  onConfirm,
}: CvrLookupProps): ReactElement {
  const { t } = useTranslation();
  const canConfirm = !disabled && !loading && /^\d{8}$/.test(value.trim());

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <TextField
        autoComplete="off"
        disabled={disabled}
        error={Boolean(error)}
        fullWidth
        helperText={error ?? t('actors.cvrLookupHint')}
        label={t('actors.cvrNumber')}
        name="cvrNumber"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (canConfirm) onConfirm();
          }
        }}
        required
        size="small"
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
        value={value}
      />
      <Button
        disabled={!canConfirm}
        loading={loading}
        onClick={onConfirm}
        sx={{ flexShrink: 0, minHeight: 40, whiteSpace: 'nowrap' }}
        type="button"
        variant="outlined"
      >
        {t('actors.cvrLookupSearch')}
      </Button>
    </Box>
  );
}
