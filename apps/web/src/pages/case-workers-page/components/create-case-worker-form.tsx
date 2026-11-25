import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { FormEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createCaseWorker,
  updateCaseWorker,
} from '../../../api/case-workers.api.js';
import type {
  CaseWorker,
  CaseWorkerInput,
} from '../../../types/case-worker.types.js';

type Field = 'name' | 'employeeNumber' | 'email' | 'phoneNumber' | 'password';

interface Props {
  onCancel: () => void;
  onSaved: (worker: CaseWorker) => void;
  worker?: CaseWorker;
}

const employeeNumberPattern = /^[a-zA-Z0-9]{1,10}$/;
const namePattern = /^[\p{L}\p{M} '\u2019-]+$/u;
const emailPattern =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Returns invalid fields in focus order. Credentials are required only on creation. */
function validateCaseWorker(
  input: CaseWorkerInput,
  creating: boolean,
): Field[] {
  const errors: Field[] = [];
  if (!namePattern.test(input.name) || !/\p{L}/u.test(input.name))
    errors.push('name');
  if (creating && !employeeNumberPattern.test(input.employeeNumber))
    errors.push('employeeNumber');
  if (!emailPattern.test(input.email)) errors.push('email');
  if (!/^\d{8}$/.test(input.phoneNumber)) errors.push('phoneNumber');
  if (
    creating &&
    (!input.password.trim() ||
      new TextEncoder().encode(input.password).length > 1024)
  )
    errors.push('password');
  return errors;
}

/** Uses the same dialog for creating and editing a caseworker. */
export default function CreateCaseWorkerForm({
  onCancel,
  onSaved,
  worker,
}: Props): ReactElement {
  const { t } = useTranslation();
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [failure, setFailure] = useState<
    'duplicateEmployeeNumber' | 'duplicateEmail' | 'save'
  >();
  const [saving, setSaving] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  /** Moves focus to the first field after the dialog opens. */
  function focusFirstField(): void {
    nameInput.current?.focus();
  }

  /** Preserves the submitted values and focuses the first field with an error. */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      name: String(data.get('name') ?? '')
        .trim()
        .normalize('NFC'),
      employeeNumber:
        worker?.employeeNumber ??
        String(data.get('employeeNumber') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      phoneNumber: String(data.get('phoneNumber') ?? ''),
      password: String(data.get('password') ?? ''),
      isSuperUser: data.has('isSuperUser'),
    };

    const errors = validateCaseWorker(input, !worker);

    setInvalid(errors);
    setFailure(undefined);
    if (errors.length) {
      const firstInvalid = form.elements.namedItem(errors[0]);
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
      return;
    }

    setSaving(true);
    try {
      if (worker) {
        const updated = await updateCaseWorker(worker.employeeNumber, {
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber,
          isSuperUser: input.isSuperUser,
        });
        onSaved(updated);
      } else {
        const result = await createCaseWorker(input);
        if ('duplicate' in result) {
          setFailure(
            result.duplicate === 'email'
              ? 'duplicateEmail'
              : 'duplicateEmployeeNumber',
          );
        } else {
          onSaved(result.caseWorker);
        }
      }
    } catch {
      setFailure('save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      aria-labelledby="create-caseworker-title"
      fullWidth
      maxWidth="sm"
      onClose={saving ? undefined : onCancel}
      open
      slotProps={{ transition: { onEntered: focusFirstField } }}
    >
      <DialogTitle id="create-caseworker-title">
        {worker
          ? t('caseworker.management.update')
          : t('caseworker.management.create')}
      </DialogTitle>
      <form noValidate onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {failure && (
              <Alert severity="error">
                {failure === 'duplicateEmployeeNumber'
                  ? t('caseworker.management.duplicateEmployeeNumber')
                  : failure === 'duplicateEmail'
                    ? t('caseworker.management.duplicateEmail')
                    : t('caseworker.management.saveError')}
              </Alert>
            )}
            <TextField
              autoComplete="name"
              defaultValue={worker?.name}
              error={invalid.includes('name')}
              helperText={
                invalid.includes('name') &&
                t('caseworker.management.invalidName')
              }
              inputRef={nameInput}
              label={t('caseworker.management.name')}
              name="name"
              required
            />
            <TextField
              defaultValue={worker?.employeeNumber}
              disabled={Boolean(worker)}
              error={invalid.includes('employeeNumber')}
              helperText={t('caseworker.management.employeeNumberHelp')}
              label={t('caseworker.management.employeeNumber')}
              name="employeeNumber"
              required
            />
            <TextField
              autoComplete="email"
              defaultValue={worker?.email}
              error={invalid.includes('email')}
              helperText={
                invalid.includes('email') &&
                t('caseworker.management.invalidEmail')
              }
              label={t('caseworker.management.email')}
              name="email"
              required
              type="email"
            />
            <TextField
              autoComplete="tel-national"
              defaultValue={worker?.phoneNumber}
              error={invalid.includes('phoneNumber')}
              helperText={
                invalid.includes('phoneNumber') &&
                t('caseworker.management.invalidPhoneNumber')
              }
              label={t('caseworker.management.phoneNumber')}
              name="phoneNumber"
              required
              type="tel"
            />
            {!worker && (
              <TextField
                autoComplete="new-password"
                error={invalid.includes('password')}
                helperText={
                  invalid.includes('password') &&
                  t('caseworker.management.invalidPassword')
                }
                label={t('caseworker.management.password')}
                name="password"
                required
                type="password"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  defaultChecked={worker?.isSuperUser}
                  name="isSuperUser"
                />
              }
              label={t('caseworker.management.grantSuperUser')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button disabled={saving} onClick={onCancel} variant="outlined">
            {t('caseworker.management.cancel')}
          </Button>
          <Button disabled={saving} type="submit" variant="contained">
            {saving
              ? t('caseworker.management.saving')
              : worker
                ? t('caseworker.management.save')
                : t('caseworker.management.submit')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
