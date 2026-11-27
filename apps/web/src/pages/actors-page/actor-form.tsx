import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { isAxiosError } from 'axios';
import type { ReactElement } from 'react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAddress } from '../../api/addresses.api.js';
import { lookupCompany } from '../../api/companies.api.js';
import { AddressSearch } from '../../components/ui/address-search/address-search.js';
import { CvrLookup } from '../../components/ui/cvr-lookup/cvr-lookup.js';
import { reportError } from '../../lib/report-error.js';
import {
  type ActorFormProps,
  ActorRole,
  actorRoles,
  type CreateActorErrors,
  type CreateActorValues,
} from './actor.types.js';
import {
  toActorSubmission,
  validateActorCvr,
  validateCreateActor,
} from './create-actor-form.validation.js';

export function ActorForm({
  initialActor,
  onCancel,
  onSave,
}: ActorFormProps): ReactElement {
  const { t } = useTranslation();
  const roleLabels: Record<ActorRole, string> = {
    [ActorRole.Supplier]: t('actors.roles.Supplier'),
    [ActorRole.Contractor]: t('actors.roles.Contractor'),
    [ActorRole.NetworkOperator]: t('actors.roles.NetworkOperator'),
    [ActorRole.ProjectCoordinator]: t('actors.roles.ProjectCoordinator'),
    [ActorRole.Private]: t('actors.roles.Private'),
  };
  const [values, setValues] = useState<CreateActorValues>(() =>
    initialActor
      ? {
          role: initialActor.role,
          name: initialActor.name,
          phoneNumber: initialActor.phoneNumber,
          email: initialActor.email,
          address: initialActor.address,
          addressId: initialActor.address.uuid,
          cvrNumber: initialActor.cvrNumber ?? '',
          department: initialActor.department ?? '',
        }
      : {
          role: '',
          name: '',
          phoneNumber: '',
          email: '',
          address: null,
          addressId: null,
          cvrNumber: '',
          department: '',
        },
  );
  const [errors, setErrors] = useState<CreateActorErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [lookingUpCompany, setLookingUpCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string>();
  const [companyNotice, setCompanyNotice] = useState<string>();
  const [addressVersion, setAddressVersion] = useState(0);
  const companyController = useRef<AbortController | null>(null);
  const isMounted = useRef(false);
  const roleInput = useRef<{ focus: () => void } | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      companyController.current?.abort();
    };
  }, []);

  function change(
    field: Exclude<keyof CreateActorValues, 'address' | 'addressId'>,
    value: string,
  ): void {
    if (field === 'cvrNumber' || field === 'role') {
      companyController.current?.abort();
      setLookingUpCompany(false);
      setCompanyError(undefined);
      setCompanyNotice(undefined);
    }
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function confirmCvr(): Promise<void> {
    if (saving || lookingUpCompany || values.role === ActorRole.Private) return;
    const cvrNumber = values.cvrNumber.trim();
    if (!/^\d{8}$/.test(cvrNumber)) {
      setErrors((current) => ({
        ...current,
        cvrNumber: 'Angiv præcis 8 cifre.',
      }));
      return;
    }
    companyController.current?.abort();
    const controller = new AbortController();
    companyController.current = controller;
    setLookingUpCompany(true);
    setCompanyError(undefined);
    setCompanyNotice(undefined);
    try {
      const company = await lookupCompany(cvrNumber, controller.signal);
      if (controller.signal.aborted) return;
      setValues((current) => ({
        ...current,
        cvrNumber,
        name: company.name,
        phoneNumber: company.phoneNumber,
        email: company.email,
        address: company.address,
        addressId: company.addressId,
      }));
      setAddressVersion((current) => current + 1);
      setErrors((current) => ({
        ...current,
        cvrNumber: undefined,
        name: undefined,
        phoneNumber: undefined,
        email: undefined,
        address: undefined,
      }));
      setCompanyNotice(
        'Virksomhedens oplysninger er hentet. Kontrollér dem, før du gemmer.',
      );
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        reportError('Company lookup failed', error);
        setCompanyError(
          error instanceof Error && error.name === 'Error'
            ? error.message
            : 'Virksomhedens oplysninger kunne ikke hentes. Prøv igen.',
        );
      }
    } finally {
      if (!controller.signal.aborted) setLookingUpCompany(false);
    }
  }

  function changeAddress(
    address: VerifiedAddress | null,
    addressId: string | null,
  ): void {
    setValues((current) => ({ ...current, address, addressId }));
    setErrors((current) => ({ ...current, address: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving || lookingUpCompany) return;
    const nextErrors = validateCreateActor(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = Object.keys(nextErrors)[0];
      if (firstInvalid === 'role') {
        roleInput.current?.focus();
      } else {
        event.currentTarget
          .querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
          ?.focus();
      }
      return;
    }
    setSaving(true);
    setSaveError(undefined);
    try {
      const cvrError = await validateActorCvr(values);
      // Dismissing the editor during verification must not trigger a write.
      if (!isMounted.current) return;
      if (cvrError) {
        setErrors((current) => ({ ...current, cvrNumber: cvrError }));
        return;
      }
      await onSave(toActorSubmission(values));
    } catch (error: unknown) {
      if (
        initialActor &&
        isAxiosError(error) &&
        error.response?.status === 404
      ) {
        setSaveError(t('actors.errors.notFound'));
        return;
      }
      if (
        isAxiosError<{ field?: unknown; message?: unknown }>(error) &&
        error.response?.status === 409
      ) {
        const { field, message } = error.response.data;
        if (
          (field === 'cvrNumber' || field === 'email') &&
          typeof message === 'string'
        ) {
          setErrors((current) => ({ ...current, [field]: message }));
          return;
        }
      }
      reportError('Saving actor failed', error);
      setSaveError(
        'Aktøren kunne ikke gemmes. Dine oplysninger er bevaret. Prøv igen.',
      );
    } finally {
      setSaving(false);
    }
  }

  function field(
    name: Exclude<keyof CreateActorValues, 'role' | 'address' | 'addressId'>,
    label: string,
    placeholder?: string,
  ): ReactElement {
    const digits = ['phoneNumber', 'cvrNumber'].includes(name);
    return (
      <TextField
        autoComplete={
          name === 'name'
            ? values.role && values.role !== ActorRole.Private
              ? 'organization'
              : 'name'
            : name === 'phoneNumber'
              ? 'tel-national'
              : name === 'email'
                ? 'email'
                : 'off'
        }
        disabled={saving || lookingUpCompany}
        error={Boolean(errors[name])}
        fullWidth
        helperText={errors[name]}
        label={label}
        name={name}
        onBlur={
          name === 'email'
            ? () =>
                setErrors((current) => ({
                  ...current,
                  email: validateCreateActor(values).email,
                }))
            : undefined
        }
        onChange={(event) => change(name, event.target.value)}
        placeholder={placeholder}
        required
        size="small"
        slotProps={{
          htmlInput: digits
            ? { inputMode: 'numeric', maxLength: 8 }
            : undefined,
        }}
        type={
          name === 'email' ? 'email' : name === 'phoneNumber' ? 'tel' : 'text'
        }
        value={values[name]}
      />
    );
  }

  return (
    <Paper
      aria-busy={saving || lookingUpCompany}
      component="form"
      elevation={0}
      noValidate
      onSubmit={submit}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {saveError && (
          <Alert
            closeText="Luk"
            onClose={() => setSaveError(undefined)}
            severity="error"
            sx={{ mb: 3 }}
          >
            {saveError}
          </Alert>
        )}
        <TextField
          disabled={saving || Boolean(initialActor)}
          error={Boolean(errors.role)}
          fullWidth
          helperText={errors.role}
          inputRef={roleInput}
          label={t('actors.role')}
          name="role"
          onChange={(event) => change('role', event.target.value)}
          required
          select
          size="small"
          sx={{ maxWidth: 320, mb: 3 }}
          value={values.role}
        >
          {actorRoles.map((role) => (
            <MenuItem key={role} value={role}>
              {roleLabels[role]}
            </MenuItem>
          ))}
        </TextField>
        {values.role !== ActorRole.Private && (
          <Box sx={{ maxWidth: 520, mb: 3 }}>
            <CvrLookup
              disabled={saving}
              error={errors.cvrNumber}
              loading={lookingUpCompany}
              onChange={(value) => change('cvrNumber', value)}
              onConfirm={() => void confirmCvr()}
              value={values.cvrNumber}
            />
          </Box>
        )}
        {companyError && (
          <Alert
            closeText="Luk"
            onClose={() => setCompanyError(undefined)}
            severity="error"
            sx={{ mb: 3 }}
          >
            {companyError}
          </Alert>
        )}
        {companyNotice && (
          <Alert
            closeText="Luk"
            onClose={() => setCompanyNotice(undefined)}
            severity="info"
            sx={{ mb: 3 }}
          >
            {companyNotice}
          </Alert>
        )}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          {field(
            'name',
            'Navn',
            values.role && values.role !== ActorRole.Private
              ? 'Virksomhedens navn'
              : 'Fulde navn',
          )}
          {field('phoneNumber', 'Telefonnummer')}
          {field('email', 'E-mail', 'E-mailadresse')}
          <AddressSearch
            disabled={saving || lookingUpCompany}
            error={errors.address}
            initialAddress={values.address ?? undefined}
            initialAddressId={values.addressId ?? undefined}
            key={addressVersion}
            onChange={changeAddress}
          />
          {values.role !== ActorRole.Private && field('department', 'Afdeling')}
        </Box>
      </Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          bgcolor: 'grey.100',
          borderTop: 1,
          borderColor: 'divider',
          justifyContent: 'flex-end',
          p: { xs: 2, md: 3 },
        }}
      >
        <Button
          color="secondary"
          disabled={saving}
          onClick={onCancel}
          sx={{
            minHeight: 42,
          }}
          variant="contained"
        >
          Annuller
        </Button>
        <Button
          disabled={saving || lookingUpCompany}
          sx={{ minHeight: 42 }}
          type="submit"
          variant="contained"
        >
          {saving
            ? initialActor
              ? 'Opdaterer aktør…'
              : 'Gemmer aktør…'
            : initialActor
              ? 'Opdater aktør'
              : 'Gem aktør'}
        </Button>
      </Stack>
    </Paper>
  );
}
