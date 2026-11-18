import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mapMunicipalityToForm } from '../../api/mappers/municipalities.mapper.js';
import {
  getMunicipality,
  updateMunicipality,
} from '../../api/municipalities.api.js';
import AddressAutocomplete from '../../components/address/address-autocomplete.js';
import { parseAddress } from '../../components/address/address-parser.js';
import type {
  Municipality,
  UpdateMunicipality as MunicipalityUpdate,
} from '../../types/municipality.types.js';

export default function UpdateMunicipality({
  municipalityId,
}: {
  municipalityId: number;
}) {
  const { t } = useTranslation();
  const [municipality, setMunicipality] = useState<Municipality>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMunicipality() {
      try {
        const result = await getMunicipality(municipalityId, controller.signal);
        if (!controller.signal.aborted) {
          setMunicipality(result);
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadError(true);
        }
      }
    }

    void loadMunicipality();
    return () => controller.abort();
  }, [municipalityId]);

  if (loadError) {
    return <Alert severity="error">{t('municipality.update.loadError')}</Alert>;
  }

  if (!municipality) {
    return (
      <Typography role="status">{t('municipality.update.loading')}</Typography>
    );
  }

  return <MunicipalityUpdateForm municipality={municipality} />;
}

function MunicipalityUpdateForm({
  municipality,
}: {
  municipality: Municipality;
}) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(() => mapMunicipalityToForm(municipality));
  const [email, setEmail] = useState(saved.email);
  const [phoneNumber, setPhoneNumber] = useState(saved.phoneNumber);
  const [address, setAddress] = useState<MunicipalityUpdate['address'] | null>(
    saved.address,
  );
  const [addressKey, setAddressKey] = useState(0);
  const [addressError, setAddressError] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const saving = status === 'saving';

  function resetForm(values: MunicipalityUpdate): void {
    setEmail(values.email);
    setPhoneNumber(values.phoneNumber);
    setAddress(values.address);
    setAddressError(false);
    setAddressKey((key) => key + 1);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setStatus('idle');

    if (!address) {
      setAddressError(true);
      return;
    }

    setStatus('saving');

    try {
      const updated = await updateMunicipality(municipality.id, {
        address,
        email,
        phoneNumber,
      });
      const values = mapMunicipalityToForm(updated);
      setSaved(values);
      resetForm(values);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Box aria-busy={saving} component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Typography component="h2" variant="h6">
          {municipality.name}
        </Typography>
        {status === 'success' && (
          <Alert role="status" severity="success">
            {t('municipality.update.success')}
          </Alert>
        )}
        {status === 'error' && (
          <Alert severity="error">{t('municipality.update.saveError')}</Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            columnGap: { xs: 2, md: 5 },
            rowGap: 3,
          }}
        >
          <TextField
            autoComplete="tel-national"
            disabled={saving}
            fullWidth
            label={t('municipality.create.phoneNumber')}
            onChange={(event) => setPhoneNumber(event.target.value)}
            required
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                maxLength: 8,
                pattern: '[0-9]{8}',
              },
            }}
            type="tel"
            value={phoneNumber}
          />
          <TextField
            autoComplete="email"
            disabled={saving}
            fullWidth
            label={t('municipality.create.email')}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </Box>

        <AddressAutocomplete
          disabled={saving}
          errorMessage={
            addressError ? t('municipality.create.addressError') : undefined
          }
          initialAddressText={`${saved.address.street} ${saved.address.houseNumber}, ${saved.address.postalCode} ${saved.address.city}`}
          key={addressKey}
          onChange={(suggestion) => {
            setAddressError(false);
            if (!suggestion) {
              setAddress(null);
              return;
            }

            try {
              setAddress(parseAddress(suggestion));
            } catch {
              setAddress(null);
              setAddressError(true);
            }
          }}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'flex-end', mt: { xs: 3, md: 8 } }}
        >
          <Button
            disabled={saving}
            onClick={() => {
              resetForm(saved);
              setStatus('idle');
            }}
            variant="outlined"
          >
            {t('municipality.create.cancel')}
          </Button>
          <Button disabled={saving} type="submit" variant="contained">
            {saving
              ? t('municipality.update.saving')
              : t('municipality.update.save')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
