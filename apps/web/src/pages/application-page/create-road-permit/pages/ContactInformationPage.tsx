import { Box, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ContactInformation } from '../formTypes';
import type { validateContactInformation } from '../validation';

type ContactInformationPageProps = {
  errors?: ReturnType<typeof validateContactInformation>;
  value: ContactInformation;
  onChange: (value: ContactInformation) => void;
};

export function ContactInformationPage({
  errors,
  value,
  onChange,
}: ContactInformationPageProps) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
        mx: 'auto',
      }}
    >
      <Typography component="h3" variant="h6">
        {t('permit.contact.heading')}
      </Typography>
      <TextField
        autoComplete="name"
        error={Boolean(errors?.name)}
        fullWidth
        helperText={errors?.name}
        id="contact-name"
        label={t('permit.contact.name')}
        name="contactName"
        onChange={(event) => onChange({ ...value, name: event.target.value })}
        required
        value={value.name}
      />
      <TextField
        autoComplete="tel"
        error={Boolean(errors?.phone)}
        fullWidth
        helperText={errors?.phone}
        id="contact-phone"
        label={t('permit.contact.phone')}
        name="contactPhone"
        onChange={(event) => onChange({ ...value, phone: event.target.value })}
        required
        type="tel"
        value={value.phone}
      />
      <TextField
        autoComplete="email"
        error={Boolean(errors?.email)}
        fullWidth
        helperText={errors?.email}
        id="contact-email"
        label={t('permit.contact.email')}
        name="contactEmail"
        onChange={(event) => onChange({ ...value, email: event.target.value })}
        required
        type="email"
        value={value.email}
      />
    </Box>
  );
}
