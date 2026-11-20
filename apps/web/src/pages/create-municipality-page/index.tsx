import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createMunicipality } from '../../api/municipalities.api.js';
import AddressAutocomplete from '../../components/address/address-autocomplete.js';
import { parseAddress } from '../../components/address/address-parser.js';
import AdminLayout from '../../components/layout/app-shell/admin-layout.js';
import PhoneNumberField from '../../components/municipality/phone-number-field.js';
import type { CreateMunicipality } from '../../types/municipality.types.js';

const initialValues: CreateMunicipality = {
  name: '',
  region: '',
  phoneNumber: '',
  email: '',
  address: {
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
  },
};

/**
 * Renders the administrator form with region, contact details, and address
 * lookup and shows the outcome after submission.
 */
export default function CreateMunicipalityPage(): ReactElement {
  const { t } = useTranslation();

  const [form, setForm] = useState<CreateMunicipality>(initialValues);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [addressKey, setAddressKey] = useState(0);

  /**
   * Updates one top-level form field while preserving the other values.
   */
  const updateField = (
    field: 'name' | 'region' | 'phoneNumber' | 'email',
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /**
   * Restores the empty initial form values and clears the address search text.
   */
  const resetForm = () => {
    setForm(initialValues);
    setAddressError(false);
    setAddressKey((previous) => previous + 1);
  };

  /**
   * Checks that a complete address is selected before creating the
   * municipality. Resets the form on success and preserves the entered values
   * if the request fails.
   */
  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setSuccess(false);
    setError(false);

    if (
      !form.address.street ||
      !form.address.houseNumber ||
      !form.address.postalCode ||
      !form.address.city
    ) {
      setAddressError(true);
      return;
    }

    setSaving(true);

    try {
      await createMunicipality(form);
      resetForm();
      setSuccess(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <title>{t('municipality.create.title')}</title>
      <Box sx={{ width: '100%', maxWidth: 850 }}>
        <Typography component="h1" sx={{ mb: 4, fontWeight: 600 }} variant="h4">
          {t('municipality.create.title')}
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {success && (
              <Alert severity="success">
                {t('municipality.create.success')}
              </Alert>
            )}

            {error && (
              <Alert severity="error">{t('municipality.create.error')}</Alert>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                columnGap: { xs: 2, md: 5 },
                rowGap: 3,
              }}
            >
              <TextField
                fullWidth
                label={t('municipality.create.name')}
                onChange={(event) => updateField('name', event.target.value)}
                required
                slotProps={{
                  htmlInput: {
                    pattern: /(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*/u.source,
                    title: t('municipality.create.nameFormat'),
                  },
                }}
                value={form.name}
              />

              <TextField
                fullWidth
                label={t('municipality.create.region')}
                onChange={(event) => updateField('region', event.target.value)}
                required
                select
                value={form.region}
              >
                {[
                  'Region Hovedstaden',
                  'Region Sjælland',
                  'Region Syddanmark',
                  'Region Midtjylland',
                  'Region Nordjylland',
                ].map((region) => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </TextField>

              <PhoneNumberField
                onChange={(value) => updateField('phoneNumber', value)}
                value={form.phoneNumber}
              />

              <TextField
                autoComplete="email"
                fullWidth
                label={t('municipality.create.email')}
                onChange={(event) => updateField('email', event.target.value)}
                required
                type="email"
                value={form.email}
              />
            </Box>

            <Box>
              <AddressAutocomplete
                errorMessage={
                  addressError
                    ? t('municipality.create.addressError')
                    : undefined
                }
                key={addressKey}
                onChange={(address) => {
                  setAddressError(false);

                  if (!address) {
                    setForm((previous) => ({
                      ...previous,
                      address: initialValues.address,
                    }));
                    return;
                  }

                  try {
                    const parsedAddress = parseAddress(address);

                    setForm((previous) => ({
                      ...previous,
                      address: parsedAddress,
                    }));
                  } catch {
                    setAddressError(true);
                    setForm((previous) => ({
                      ...previous,
                      address: initialValues.address,
                    }));
                  }
                }}
              />
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                justifyContent: 'flex-end',
                mt: { xs: 3, md: 8 },
              }}
            >
              <Button
                disabled={saving}
                onClick={() => {
                  resetForm();
                  setError(false);
                  setSuccess(false);
                }}
                variant="outlined"
              >
                {t('municipality.create.cancel')}
              </Button>

              <Button disabled={saving} type="submit" variant="contained">
                {t('municipality.create.save')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </AdminLayout>
  );
}
