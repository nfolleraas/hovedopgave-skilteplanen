import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { VerifiedAddress } from '../../api/addresses.api.js';
import {
  ActorRole,
  type CreateActorErrors,
  type CreateActorFormProps,
  type CreateActorValues,
} from './actor.types.js';
import { ActorAddressField } from './actor-address-field.js';
import { actorRoles } from './actor-form.validation.js';
import {
  toActorSubmission,
  validateCreateActor,
} from './create-actor-form.validation.js';

export function CreateActorForm({ onCancel, onSave }: CreateActorFormProps) {
  const { t } = useTranslation();
  const roleLabels: Record<ActorRole, string> = {
    [ActorRole.Supplier]: t('actors.roles.Supplier'),
    [ActorRole.Contractor]: t('actors.roles.Contractor'),
    [ActorRole.NetworkOperator]: t('actors.roles.NetworkOperator'),
    [ActorRole.ProjectCoordinator]: t('actors.roles.ProjectCoordinator'),
    [ActorRole.Private]: t('actors.roles.Private'),
  };
  const [values, setValues] = useState<CreateActorValues>({
    role: '',
    name: '',
    phoneNumber: '',
    email: '',
    address: null,
    addressId: null,
    cvrNumber: '',
    department: '',
    contactPerson: '',
  });
  const [errors, setErrors] = useState<CreateActorErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  function change(
    field: Exclude<keyof CreateActorValues, 'address' | 'addressId'>,
    value: string,
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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
    if (saving) return;
    const nextErrors = validateCreateActor(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = Object.keys(nextErrors)[0];
      event.currentTarget
        .querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
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
    const digits = ['phoneNumber', 'cvrNumber', 'department'].includes(name);
    return (
      <TextField
        disabled={saving}
        error={Boolean(errors[name])}
        fullWidth
        helperText={errors[name] ?? (digits ? '8 cifre' : undefined)}
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
        type={name === 'email' ? 'email' : 'text'}
        value={values[name]}
      />
    );
  }

  return (
    <Paper
      aria-busy={saving}
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
          autoFocus
          disabled={saving}
          error={Boolean(errors.role)}
          fullWidth
          helperText={errors.role}
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
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
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
          <ActorAddressField
            disabled={saving}
            error={errors.address}
            onChange={changeAddress}
          />
          {values.role && values.role !== ActorRole.Private && (
            <>
              {field('cvrNumber', 'CVR-nummer')}
              {field('department', 'Afdeling')}
              {field('contactPerson', 'Kontaktperson', 'Fulde navn')}
            </>
          )}
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
          disabled={saving}
          sx={{ minHeight: 42 }}
          type="submit"
          variant="contained"
        >
          {saving ? 'Gemmer aktør…' : 'Gem aktør'}
        </Button>
      </Stack>
    </Paper>
  );
}
