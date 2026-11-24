import { Box, MenuItem, TextField } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  availabilityLabelKeys,
  contactPersonFieldLabelKeys,
} from '../../../../features/contact-persons/contact-person-labels.js';
import {
  type ContactPersonFieldErrors,
  type ContactPersonFieldSet,
  normalizeEmailInput,
  normalizePhoneInput,
} from '../../../../features/contact-persons/contact-person-validation.js';
import type {
  ContactPersonFormField,
  ContactPersonFormValues,
} from '../../../../types/contact-person.types.js';
import { Availability } from '../../../../types/prisma-enums.js';
import { labelAboveSlots } from '../../components/form-fields.js';

// Same limits as the API's create-contact-person.dto.ts.
const maxNameLength = 200;
const maxEmailLength = 254;

/** Element id of a form field, so the step can move focus to it. */
export function contactFieldId(field: ContactPersonFormField): string {
  return `contact-form-${field}`;
}

/** Cleans up typed or pasted input before it is stored in the draft. */
const normalizers: Partial<
  Record<ContactPersonFormField, (value: string) => string>
> = {
  phoneNumber: normalizePhoneInput,
  email: normalizeEmailInput,
};

interface ContactFormProps {
  values: ContactPersonFormValues;
  /** Every current error, whether it is shown yet or not. */
  errors: ContactPersonFieldErrors;
  /** True after the user tried to save, so every error is shown. */
  showAllErrors: boolean;
  fieldSet: ContactPersonFieldSet;
  disabled: boolean;
  onChange: (field: ContactPersonFormField, value: string) => void;
}

/** Name, availability, phone number and email (UC-031 step 3–6). */
export function ContactForm({
  values,
  errors,
  showAllErrors,
  fieldSet,
  disabled,
  onChange,
}: ContactFormProps) {
  const { t } = useTranslation();
  // Fields the user has left. A format error, such as a 7 digit phone
  // number, shows as soon as the field is left and then updates while
  // typing. A missing value only shows when the user tries to save.
  const [leftFields, setLeftFields] = useState<Set<ContactPersonFormField>>(
    () => new Set(),
  );

  function shownError(field: ContactPersonFormField) {
    const error = errors[field];
    if (!error || showAllErrors) return error;
    return leftFields.has(field) && error !== 'required' ? error : undefined;
  }

  // MUI links the label and helperText to the input, so the label stays
  // accessible even though it is shown above the field.
  function fieldProps(
    field: ContactPersonFormField,
    htmlInput?: Record<string, unknown>,
  ) {
    const error = shownError(field);
    const normalize = normalizers[field];
    return {
      id: contactFieldId(field),
      label: t(contactPersonFieldLabelKeys[field]),
      value: values[field],
      onChange: (event: { target: { value: string } }) =>
        onChange(
          field,
          normalize ? normalize(event.target.value) : event.target.value,
        ),
      onBlur: () =>
        setLeftFields((current) =>
          current.has(field) ? current : new Set(current).add(field),
        ),
      error: Boolean(error),
      helperText: error ? t(`contacts.errors.${field}.${error}`) : undefined,
      required: true,
      disabled,
      fullWidth: true,
      slotProps: { ...labelAboveSlots, htmlInput },
    };
  }

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <TextField
        {...fieldProps('name', {
          autoComplete: 'name',
          maxLength: maxNameLength,
        })}
      />
      {/* Availability and phone number share a row, as in the wireframe. */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        {fieldSet.availability ? (
          <TextField {...fieldProps('availability')} select>
            {Object.values(Availability).map((value) => (
              <MenuItem key={value} value={value}>
                {t(availabilityLabelKeys[value])}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          // Road use applications always use Day (UC-031 A1, UC-033 A1), so
          // the field is shown disabled with the reason below it.
          <TextField
            disabled
            fullWidth
            helperText={t('contacts.availabilityFixed')}
            id={contactFieldId('availability')}
            label={t(contactPersonFieldLabelKeys.availability)}
            required
            select
            slotProps={labelAboveSlots}
            value={Availability.Day}
          >
            <MenuItem value={Availability.Day}>
              {t(availabilityLabelKeys.Day)}
            </MenuItem>
          </TextField>
        )}
        {/* No maxLength: a pasted "+45 22 33 44 55" must reach the
            normalizer whole. The normalizer cuts it to 8 digits. */}
        <TextField
          {...fieldProps('phoneNumber', {
            autoComplete: 'tel-national',
            inputMode: 'numeric',
          })}
          type="tel"
        />
      </Box>
      <TextField
        {...fieldProps('email', {
          autoComplete: 'email',
          inputMode: 'email',
          maxLength: maxEmailLength,
        })}
        type="email"
      />
    </Box>
  );
}
