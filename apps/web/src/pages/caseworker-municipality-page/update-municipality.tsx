import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { mapMunicipalityToForm } from '../../api/mappers/municipalities.mapper.js';
import {
  getMunicipality,
  MunicipalityValidationError,
  updateMunicipality,
} from '../../api/municipalities.api.js';
import AddressAutocomplete from '../../components/address/address-autocomplete.js';
import { parseAddress } from '../../components/address/address-parser.js';
import PhoneNumberField from '../../components/municipality/phone-number-field.js';
import type {
  Municipality,
  UpdateMunicipality as MunicipalityUpdate,
} from '../../types/municipality.types.js';

/**
 * Fetches the municipality for the given ID and shows a loading status, an
 * error, or the edit form populated with saved values.
 */
export default function UpdateMunicipality({
  editing,
  municipalityId,
}: {
  editing: boolean;
  municipalityId: number;
}): ReactElement {
  const { t } = useTranslation();
  const [municipality, setMunicipality] = useState<Municipality>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    /**
     * Fetches municipality details and updates the component only while the
     * request is still active.
     */
    async function loadMunicipality(): Promise<void> {
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

  if (editing) {
    return <MunicipalityUpdateForm municipality={municipality} />;
  }

  const { address, email, name, phoneNumber } = municipality;
  return (
    <Stack spacing={2}>
      <Typography component="h2" variant="h6">
        {name}
      </Typography>
      <Box component="dl">
        <dt>{t('municipality.create.email')}</dt>
        <dd>{email}</dd>
        <dt>{t('municipality.create.phoneNumber')}</dt>
        <dd>{phoneNumber}</dd>
        <dt>{t('address.label')}</dt>
        <dd>
          {address.street} {address.houseNumber}, {address.postalCode}{' '}
          {address.city}
        </dd>
      </Box>
    </Stack>
  );
}

/**
 * Lets the caseworker edit the municipality’s email address, phone number, and
 * address. Keeps a copy of the last saved values so the form can be reset.
 */
function MunicipalityUpdateForm({
  municipality,
}: {
  municipality: Municipality;
}): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [validationCode, setValidationCode] =
    useState<MunicipalityValidationError['code']>();
  const saving = status === 'saving';
  const hasChanges =
    email !== saved.email ||
    phoneNumber !== saved.phoneNumber ||
    (address !== null &&
      (address.street !== saved.address.street ||
        address.houseNumber !== saved.address.houseNumber ||
        address.postalCode !== saved.address.postalCode ||
        address.city !== saved.address.city));
  const canSave = !saving && address !== null && hasChanges;
  const validationMessages = {
    invalidEmail: t('municipality.update.invalidEmail'),
    emailInUse: t('municipality.update.emailInUse'),
    phoneNumberInUse: t('municipality.update.phoneNumberInUse'),
    invalidPhoneNumber: t('municipality.update.invalidPhoneNumber'),
    invalidAddress: t('municipality.create.addressError'),
    invalidPostalCode: t('municipality.update.invalidPostalCode'),
  };

  const emailInvalid =
    status === 'error' &&
    (validationCode === 'invalidEmail' || validationCode === 'emailInUse');
  const phoneInvalid =
    status === 'error' &&
    (validationCode === 'invalidPhoneNumber' ||
      validationCode === 'phoneNumberInUse');
  const addressValidationMessage =
    status === 'error' &&
    (validationCode === 'invalidAddress' ||
      validationCode === 'invalidPostalCode')
      ? validationMessages[validationCode]
      : undefined;

  /**
   * Restores the supplied form values and remounts the address field with the
   * saved address, clearing any active search.
   */
  function resetForm(values: MunicipalityUpdate): void {
    setEmail(values.email);
    setPhoneNumber(values.phoneNumber);
    setAddress(values.address);
    setAddressError(false);
    setAddressKey((key) => key + 1);
  }

  /**
   * Checks the selected address and sends the three editable fields to the
   * API. Shows the saved response on success and keeps the draft on failure.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!canSave || !address) {
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
    } catch (error) {
      setValidationCode(
        error instanceof MunicipalityValidationError ? error.code : undefined,
      );
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
          <Alert severity="error">
            {validationCode
              ? validationMessages[validationCode]
              : t('municipality.update.saveError')}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            columnGap: { xs: 2, md: 5 },
            rowGap: 3,
          }}
        >
          <PhoneNumberField
            disabled={saving}
            error={phoneInvalid}
            onChange={setPhoneNumber}
            value={phoneNumber}
          />
          <TextField
            autoComplete="email"
            disabled={saving}
            error={emailInvalid}
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
            addressError
              ? t('municipality.create.addressError')
              : addressValidationMessage
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

        {status === 'idle' && !hasChanges && address !== null && (
          <Typography color="text.secondary" variant="body2">
            {t('municipality.update.noChanges')}
          </Typography>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'flex-end', mt: { xs: 3, md: 8 } }}
        >
          <Button
            disabled={saving}
            onClick={() => {
              void navigate(`/sagsbehandler/kommuner/${municipality.id}`);
            }}
            variant="outlined"
          >
            {t('municipality.create.cancel')}
          </Button>
          <Button disabled={!canSave} type="submit" variant="contained">
            {saving
              ? t('municipality.update.saving')
              : t('municipality.update.save')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
