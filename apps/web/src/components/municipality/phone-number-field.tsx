import { TextField } from '@mui/material';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface PhoneNumberFieldProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}

/**
 * Renders the required eight-digit phone field used by both municipality forms.
 */
export default function PhoneNumberField({
  disabled,
  onChange,
  value,
}: PhoneNumberFieldProps): ReactElement {
  const { t } = useTranslation();

  return (
    <TextField
      autoComplete="tel-national"
      disabled={disabled}
      fullWidth
      label={t('municipality.create.phoneNumber')}
      onChange={(event) => onChange(event.target.value)}
      required
      slotProps={{
        htmlInput: {
          inputMode: 'numeric',
          maxLength: 8,
          pattern: '[0-9]{8}',
        },
      }}
      type="tel"
      value={value}
    />
  );
}
