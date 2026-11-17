import { Box, MenuItem, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  availabilityLabelKeys,
  contactPersonFieldLabelKeys,
} from '../../../features/contact-persons/contact-person-labels.js';
import type {
  ContactPersonFieldErrors,
  ContactPersonFieldSet,
} from '../../../features/contact-persons/contact-person-validation.js';
import type {
  ContactPersonFormField,
  ContactPersonFormValues,
} from '../../../types/contact-person.types.js';
import { Availability } from '../../../types/prisma-enums.js';
import { labelAboveSlots } from './form-slots.js';

interface ContactFormProps {
  idPrefix: string;
  values: ContactPersonFormValues;
  errors: ContactPersonFieldErrors;
  fieldSet: ContactPersonFieldSet;
  disabled: boolean;
  onChange: (field: ContactPersonFormField, value: string) => void;
}

export function ContactForm({
  idPrefix,
  values,
  errors,
  fieldSet,
  disabled,
  onChange,
}: ContactFormProps) {
  const { t } = useTranslation();

  // MUI links the label and helperText to the input, so the label stays
  // accessible even though it is shown above the field.
  function fieldProps(
    field: ContactPersonFormField,
    htmlInput?: Record<string, unknown>,
  ) {
    const error = errors[field];
    return {
      id: `${idPrefix}-${field}`,
      label: t(contactPersonFieldLabelKeys[field]),
      value: values[field],
      onChange: (event: { target: { value: string } }) =>
        onChange(field, event.target.value),
      error: Boolean(error),
      helperText: error ? t(`contacts.errors.${error}`) : undefined,
      required: true,
      disabled,
      fullWidth: true,
      slotProps: { ...labelAboveSlots, htmlInput },
    };
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Row>
        <TextField {...fieldProps('name')} />
        {fieldSet.availability ? (
          <TextField {...fieldProps('availability')} select>
            {Object.values(Availability).map((value) => (
              <MenuItem key={value} value={value}>
                {t(availabilityLabelKeys[value])}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          // Road use applications always use Day (UC-031 A1, UC-033 A1).
          <Typography
            color="text.secondary"
            sx={{ alignSelf: 'center' }}
            variant="body2"
          >
            {t('contacts.availabilityFixed')}
          </Typography>
        )}
      </Row>
      <Row>
        <TextField
          {...fieldProps('phoneNumber', { inputMode: 'numeric', maxLength: 8 })}
        />
        <TextField {...fieldProps('email', { inputMode: 'email' })} />
      </Row>
    </Box>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(auto-fit, minmax(0, 1fr))',
        },
      }}
    >
      {children}
    </Box>
  );
}
