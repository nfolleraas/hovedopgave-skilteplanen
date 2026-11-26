import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type ApplicantProfile,
  ApplicantProfileError,
  getApplicantProfile,
  updateApplicantProfile,
} from '../../api/applicants.api.js';

export default function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ApplicantProfile>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<'unavailable' | 'loadError'>();
  const [saveError, setSaveError] = useState(false);
  const [fieldError, setFieldError] = useState<ApplicantProfileError>();

  useEffect(() => {
    const controller = new AbortController();
    getApplicantProfile(controller.signal)
      .then(setProfile)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof ApplicantProfileError && error.status === 404
              ? 'unavailable'
              : 'loadError',
          );
        }
      });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setSaveError(false);
    setFieldError(undefined);

    try {
      setProfile(
        await updateApplicantProfile({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          phoneNumber: String(data.get('phoneNumber') ?? ''),
          ...(profile.type === 'Business' && {
            cvrNumber: String(data.get('cvrNumber') ?? ''),
          }),
        }),
      );
      setEditing(false);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApplicantProfileError && error.fields.length) {
        setFieldError(error);
      } else {
        setSaveError(true);
      }
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { name: 'name', label: t('profile.name'), value: profile?.name },
    {
      name: 'email',
      label: t('profile.email'),
      value: profile?.email,
      type: 'email',
    },
    {
      name: 'phoneNumber',
      label: t('profile.phoneNumber'),
      value: profile?.phoneNumber,
      type: 'tel',
    },
  ];
  if (profile?.type === 'Business') {
    fields.push({
      name: 'cvrNumber',
      label: t('profile.cvrNumber'),
      value: profile.cvrNumber ?? '',
    });
  }

  const loadMessage =
    loadError === 'unavailable'
      ? t('profile.unavailable')
      : t('profile.loadError');

  return (
    <main>
      <title>{t('navigation.profile')}</title>
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
        <Typography component="h1" sx={{ mb: 3 }} variant="h4">
          {t('navigation.profile')}
        </Typography>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          {loadError && <Alert severity="error">{loadMessage}</Alert>}
          {!profile && !loadError && (
            <Typography role="status">{t('profile.loading')}</Typography>
          )}
          {saved && <Alert severity="success">{t('profile.saved')}</Alert>}
          {profile && editing && (
            <Box component="form" noValidate onSubmit={save}>
              <Stack spacing={2}>
                {saveError && (
                  <Alert severity="error">{t('profile.saveError')}</Alert>
                )}
                {fields.map(({ name, label, value, type }) => {
                  const invalid = fieldError?.fields.includes(name);
                  return (
                    <TextField
                      defaultValue={value}
                      disabled={saving}
                      error={invalid}
                      helperText={
                        invalid
                          ? fieldError?.status === 409
                            ? t('profile.duplicate')
                            : t('profile.invalidField', { field: label })
                          : undefined
                      }
                      key={name}
                      label={label}
                      name={name}
                      required
                      type={type}
                    />
                  );
                })}
                <Stack direction="row" spacing={2}>
                  <Button disabled={saving} type="submit" variant="contained">
                    {t('profile.save')}
                  </Button>
                  <Button
                    disabled={saving}
                    onClick={() => setEditing(false)}
                    variant="outlined"
                  >
                    {t('profile.cancel')}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
          {profile && !editing && (
            <>
              <Box component="dl" sx={{ display: 'grid', gap: 2, my: 3 }}>
                {fields.map(({ name, label, value }) => (
                  <Box key={name}>
                    <Typography component="dt" sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                    <Typography
                      component="dd"
                      sx={{ m: 0, overflowWrap: 'anywhere' }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Button
                onClick={() => {
                  setFieldError(undefined);
                  setSaveError(false);
                  setSaved(false);
                  setEditing(true);
                }}
                variant="outlined"
              >
                {t('profile.edit')}
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </main>
  );
}
