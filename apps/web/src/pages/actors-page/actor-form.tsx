import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AddressSuggestion,
  lookupAddress,
  searchAddresses,
} from '../../api/addresses.api.js';
import {
  type ActorFormErrors,
  type ActorFormProps,
  type ActorFormValues,
  ActorRole,
} from './actor.types.js';
import {
  actorRoles,
  emptyActorForm,
  validateActorForm,
} from './actor-form.validation.js';

export function ActorForm({
  applicationType,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: ActorFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ActorFormValues>(emptyActorForm);
  const [errors, setErrors] = useState<ActorFormErrors>({});
  const [addressQuery, setAddressQuery] = useState('');
  const [addressOptions, setAddressOptions] = useState<AddressSuggestion[]>([]);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);
  const [verifiedAddressId, setVerifiedAddressId] = useState<string | null>(
    null,
  );
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [addressRequestFailed, setAddressRequestFailed] = useState(false);
  const lookupController = useRef<AbortController | null>(null);
  const isPrivate = draft.role === ActorRole.Private;

  useEffect(() => {
    if (selectedAddress || resolvingAddress || addressQuery.trim().length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearchingAddress(true);
      try {
        const matches = await searchAddresses(
          addressQuery.trim(),
          controller.signal,
        );
        if (!controller.signal.aborted) setAddressOptions(matches);
      } catch {
        if (!controller.signal.aborted) setAddressRequestFailed(true);
      } finally {
        if (!controller.signal.aborted) setSearchingAddress(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [addressQuery, resolvingAddress, selectedAddress]);

  useEffect(() => () => lookupController.current?.abort(), []);

  function change<K extends keyof Omit<ActorFormValues, 'address'>>(
    field: K,
    value: ActorFormValues[K],
  ) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === 'role' && value === ActorRole.Private
        ? { cvrNumber: '', department: '' }
        : {}),
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeContact<K extends keyof ActorFormValues['contactPerson']>(
    field: K,
    value: ActorFormValues['contactPerson'][K],
  ) {
    setDraft((current) => ({
      ...current,
      contactPerson: { ...current.contactPerson, [field]: value },
    }));
    const errorField = {
      name: 'contactPersonName',
      email: 'contactPersonEmail',
      phoneNumber: 'contactPersonPhoneNumber',
      availability: 'contactAvailability',
    } as const;
    setErrors((current) => ({ ...current, [errorField[field]]: undefined }));
  }

  function clearAddress(value: string) {
    lookupController.current?.abort();
    setAddressQuery(value);
    setSelectedAddress(null);
    setVerifiedAddressId(null);
    setAddressOptions([]);
    setAddressRequestFailed(false);
    setSearchingAddress(value.trim().length >= 3);
    setResolvingAddress(false);
    setDraft((current) => ({
      ...current,
      address: { street: '', houseNumber: '', postalCode: '', city: '' },
    }));
    setErrors((current) => ({ ...current, address: undefined }));
  }

  async function selectAddress(option: AddressSuggestion | null) {
    if (!option) {
      clearAddress('');
      return;
    }

    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    setAddressQuery(option.title);
    setAddressOptions([]);
    setAddressRequestFailed(false);
    setResolvingAddress(true);
    try {
      const address = await lookupAddress(option.id, controller.signal);
      if (controller.signal.aborted) return;
      setDraft((current) => ({ ...current, address }));
      setSelectedAddress(option);
      setVerifiedAddressId(option.id);
      setErrors((current) => ({ ...current, address: undefined }));
    } catch {
      if (!controller.signal.aborted) setAddressRequestFailed(true);
    } finally {
      if (!controller.signal.aborted) setResolvingAddress(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateActorForm(
      draft,
      t,
      verifiedAddressId,
      applicationType,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !draft.role) return;
    void onSubmit({
      ...draft,
      role: draft.role,
      name: draft.name.trim(),
      email: draft.email.trim(),
      department: draft.department.trim(),
      contactPerson: isPrivate
        ? undefined
        : {
            name: draft.contactPerson.name.trim(),
            email: draft.contactPerson.email.trim(),
            phoneNumber: draft.contactPerson.phoneNumber,
            ...(draft.contactPerson.availability
              ? { availability: draft.contactPerson.availability }
              : {}),
          },
      address: {
        street: draft.address.street.trim(),
        houseNumber: draft.address.houseNumber.trim(),
        postalCode: draft.address.postalCode.trim(),
        city: draft.address.city.trim(),
      },
    });
  }

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Typography component="h2" sx={{ mb: 3 }} variant="h5">
        {t('actors.createTitle')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <TextField
          error={Boolean(errors.role)}
          helperText={errors.role}
          label={t('actors.role')}
          onChange={(event) =>
            change('role', event.target.value as ActorFormValues['role'])
          }
          required
          select
          value={draft.role}
        >
          {actorRoles.map((role) => (
            <MenuItem key={role} value={role}>
              {t(`actors.roles.${role}`)}
            </MenuItem>
          ))}
        </TextField>
        <Box />
        <TextField
          error={Boolean(errors.name)}
          helperText={errors.name}
          label={t('actors.name')}
          onChange={(event) => change('name', event.target.value)}
          required
          value={draft.name}
        />
        <TextField
          error={Boolean(errors.phoneNumber)}
          helperText={errors.phoneNumber}
          label={t('actors.phoneNumber')}
          onChange={(event) => change('phoneNumber', event.target.value)}
          required
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
          value={draft.phoneNumber}
        />
        <TextField
          error={Boolean(errors.email)}
          helperText={errors.email}
          label={t('actors.email')}
          onChange={(event) => change('email', event.target.value)}
          required
          type="email"
          value={draft.email}
        />
        <Box />
        {!isPrivate && (
          <>
            <TextField
              error={Boolean(errors.cvrNumber)}
              helperText={errors.cvrNumber}
              label={t('actors.cvrNumber')}
              onChange={(event) => change('cvrNumber', event.target.value)}
              required
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
              value={draft.cvrNumber}
            />
            <TextField
              error={Boolean(errors.department)}
              helperText={errors.department}
              label={t('actors.department')}
              onChange={(event) => change('department', event.target.value)}
              required
              value={draft.department}
            />
          </>
        )}
      </Box>
      {!isPrivate && (
        <>
          <Typography component="h3" sx={{ mt: 4, mb: 2 }} variant="h6">
            {t('actors.contactPerson')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
              },
            }}
          >
            <TextField
              error={Boolean(errors.contactPersonName)}
              helperText={errors.contactPersonName}
              label={t('actors.contactPersonName')}
              onChange={(event) => changeContact('name', event.target.value)}
              required
              value={draft.contactPerson.name}
            />
            <TextField
              error={Boolean(errors.contactPersonPhoneNumber)}
              helperText={errors.contactPersonPhoneNumber}
              label={t('actors.contactPersonPhoneNumber')}
              onChange={(event) =>
                changeContact('phoneNumber', event.target.value)
              }
              required
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
              value={draft.contactPerson.phoneNumber}
            />
            <TextField
              error={Boolean(errors.contactPersonEmail)}
              helperText={errors.contactPersonEmail}
              label={t('actors.contactPersonEmail')}
              onChange={(event) => changeContact('email', event.target.value)}
              required
              type="email"
              value={draft.contactPerson.email}
            />
            {applicationType === 'ExcavationPermit' && (
              <TextField
                error={Boolean(errors.contactAvailability)}
                helperText={errors.contactAvailability}
                label={t('actors.contactAvailability')}
                onChange={(event) =>
                  changeContact(
                    'availability',
                    event.target
                      .value as ActorFormValues['contactPerson']['availability'],
                  )
                }
                required
                select
                value={draft.contactPerson.availability}
              >
                {(['Day', 'Evening', 'Night', 'AllDay'] as const).map(
                  (availability) => (
                    <MenuItem key={availability} value={availability}>
                      {t(`actors.availability.${availability}`)}
                    </MenuItem>
                  ),
                )}
              </TextField>
            )}
          </Box>
        </>
      )}
      <Typography component="h3" sx={{ mt: 4, mb: 2 }} variant="h6">
        {t('actors.address')}
      </Typography>
      <Autocomplete
        filterOptions={(options) => options}
        getOptionLabel={(option) => option.title}
        inputValue={addressQuery}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={searchingAddress || resolvingAddress}
        loadingText={t('actors.addressSearching')}
        noOptionsText={
          addressQuery.trim().length < 3
            ? t('actors.addressSearchHint')
            : t('actors.addressNoMatches')
        }
        onChange={(_, option) => void selectAddress(option)}
        onInputChange={(_, value, reason) => {
          if (reason === 'input' || reason === 'clear') clearAddress(value);
        }}
        options={addressOptions}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(errors.address) || addressRequestFailed}
            helperText={
              addressRequestFailed
                ? t('actors.errors.addressLookup')
                : errors.address
            }
            label={t('actors.addressSearch')}
            required
          />
        )}
        value={selectedAddress}
      />
      {verifiedAddressId && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {draft.address.street} {draft.address.houseNumber},{' '}
          {draft.address.postalCode} {draft.address.city}
        </Typography>
      )}
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: 'flex-end', mt: 4 }}
      >
        <Button
          color="inherit"
          disabled={isSubmitting}
          onClick={onCancel}
          variant="contained"
        >
          {t('actors.cancel')}
        </Button>
        <Button disabled={isSubmitting} type="submit" variant="contained">
          {t('actors.saveDraft')}
        </Button>
      </Stack>
    </Box>
  );
}
