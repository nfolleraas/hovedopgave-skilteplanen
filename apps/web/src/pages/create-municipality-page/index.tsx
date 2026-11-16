import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createMunicipality } from '../../api/municipalities.api.js';
import AddressAutocomplete from '../../components/address/address-autocomplete.js';
import AdminLayout from '../../components/layout/app-shell/admin-layout.js';
import type { CreateMunicipality } from '../../types/municipality.types.js';
import { parseAddress } from '../create-applicant-page/address-parser.js';

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

export default function CreateMunicipalityPage() {
  const { t } = useTranslation();

  const [form, setForm] = useState<CreateMunicipality>(initialValues);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [addressKey, setAddressKey] = useState(0);

  const updateField = (
    field: 'name' | 'region' | 'phoneNumber' | 'email',
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialValues);
    setAddressError(false);
    setAddressKey((previous) => previous + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

            {/* Two columns on desktop, one column on mobile */}
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

              <TextField
                fullWidth
                label={t('municipality.create.phoneNumber')}
                onChange={(event) =>
                  updateField('phoneNumber', event.target.value)
                }
                required
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                    maxLength: 8,
                    pattern: '[0-9]{8}',
                  },
                }}
                value={form.phoneNumber}
              />

              <TextField
                fullWidth
                label={t('municipality.create.email')}
                onChange={(event) => updateField('email', event.target.value)}
                required
                type="email"
                value={form.email}
              />
            </Box>

            {/* Address lookup from Create Applicant */}
            <Box>
              <AddressAutocomplete
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

              {addressError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {t('municipality.create.addressError', {
                    defaultValue: 'Vælg en gyldig adresse med husnummer.',
                  })}
                </Alert>
              )}
            </Box>

            {/* Form actions */}
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
