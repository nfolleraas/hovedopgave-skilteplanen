import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAddress } from '../../api/addresses.api.js';
import { lookupCompany } from '../../api/companies.api.js';
import {
  type ActorFormProps,
  ActorRole,
  type CreateActorErrors,
  type CreateActorValues,
} from './actor.types.js';
import { actorRoles } from './actor-form.validation.js';
import { AddressSearch } from './address-search.js';
import {
  toActorSubmission,
  validateCreateActor,
} from './create-actor-form.validation.js';
import { CvrLookup } from './cvr-lookup.js';

export function ActorForm({ initialActor, onCancel, onSave }: ActorFormProps) {
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
  const [saveFailed, setSaveFailed] = useState(false);
  const [lookingUpCompany, setLookingUpCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string>();
  const [companyNotice, setCompanyNotice] = useState<string>();
  const [addressVersion, setAddressVersion] = useState(0);
  const companyController = useRef<AbortController | null>(null);
  const roleInput = useRef<{ focus: () => void } | null>(null);

  useEffect(() => () => companyController.current?.abort(), []);

  function change(
    field: Exclude<keyof CreateActorValues, 'address' | 'addressId'>,
    value: string,
  ) {
    if (field === 'cvrNumber' || field === 'role') {
      companyController.current?.abort();
      setLookingUpCompany(false);
      setCompanyError(undefined);
      setCompanyNotice(undefined);
    }
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function confirmCvr() {
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
      const missing = [
        !company.phoneNumber && 'telefonnummer',
        !company.email && 'e-mail',
        !company.address && 'adresse',
      ].filter(Boolean);
      setCompanyNotice(
        missing.length
          ? `Virksomhedens oplysninger er hentet. CVR har ingen ${missing.join(', ')}. Udfyld de manglende felter.`
          : 'Virksomhedens oplysninger er hentet. Kontrollér dem, før du gemmer.',
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setCompanyError(
          error instanceof Error && error.name === 'Error'
            ? error.message
            : 'Virksomhedens oplysninger kunne ikke hentes. Prøv igen eller udfyld felterne manuelt.',
        );
      }
    } finally {
      if (!controller.signal.aborted) setLookingUpCompany(false);
    }
  }

  function changeAddress(
    address: VerifiedAddress | null,
    addressId: string | null,
  ) {
    setValues((current) => ({ ...current, address, addressId }));
    setErrors((current) => ({ ...current, address: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
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
    setSaveFailed(false);
    try {
      await onSave(toActorSubmission(values));
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function field(
    name: Exclude<keyof CreateActorValues, 'role' | 'address' | 'addressId'>,
    label: string,
    placeholder?: string,
  ) {
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
        border: '1px solid #D7E0E9',
        borderRadius: 3,
        boxShadow: '0 4px 14px rgba(33, 54, 76, 0.06)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {saveFailed && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Aktøren kunne ikke gemmes. Dine oplysninger er bevaret. Prøv igen.
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
          <Alert severity="error" sx={{ mb: 3 }}>
            {companyError}
          </Alert>
        )}
        {companyNotice && (
          <Alert severity="info" sx={{ mb: 3 }}>
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
          bgcolor: '#F5F5F5',
          borderTop: '1px solid #D7E0E9',
          justifyContent: 'flex-end',
          p: { xs: 2, md: 3 },
        }}
      >
        <Button
          disabled={saving}
          onClick={onCancel}
          sx={{
            bgcolor: '#424242',
            '&:hover': { bgcolor: '#333333' },
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
