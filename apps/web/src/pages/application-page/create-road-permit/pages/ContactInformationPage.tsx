import { Box, TextField, Typography } from '@mui/material';
import type { ContactInformation } from '../formTypes';

type ContactInformationPageProps = {
  value: ContactInformation;
  onChange: (value: ContactInformation) => void;
};

export function ContactInformationPage({
  value,
  onChange,
}: ContactInformationPageProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
        maxWidth: 640,
        mx: 'auto',
      }}
    >
      <Typography component="h2" variant="h5">
        Kontaktoplysninger
      </Typography>
      <Typography component="h3" variant="h6">
        Opret kontaktperson
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 3,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            autoComplete="name"
            fullWidth
            id="contact-name"
            label="Navn"
            name="contactName"
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
            value={value.name}
          />
          <TextField
            autoComplete="tel"
            fullWidth
            id="contact-phone"
            label="Telefonnummer"
            name="contactPhone"
            onChange={(event) =>
              onChange({ ...value, phone: event.target.value })
            }
            type="tel"
            value={value.phone}
          />
          <TextField
            autoComplete="email"
            fullWidth
            id="contact-email"
            label="Email"
            name="contactEmail"
            onChange={(event) =>
              onChange({ ...value, email: event.target.value })
            }
            type="email"
            value={value.email}
          />
        </Box>
        <Box
          aria-labelledby="contact-availability-heading"
          component="section"
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Typography
            component="h4"
            id="contact-availability-heading"
            variant="body1"
          >
            Tilgængelig
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              id="contact-available-from"
              label="Fra"
              name="contactAvailableFrom"
              onChange={(event) =>
                onChange({ ...value, availableFrom: event.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
              type="time"
              value={value.availableFrom}
            />
            <TextField
              fullWidth
              id="contact-available-to"
              label="Til"
              name="contactAvailableTo"
              onChange={(event) =>
                onChange({ ...value, availableTo: event.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
              type="time"
              value={value.availableTo}
            />
          </Box>
          <TextField
            fullWidth
            id="contact-availability-notes"
            label="Evt. bemærkning til tilgængelighed"
            minRows={3}
            multiline
            name="contactAvailabilityNotes"
            onChange={(event) =>
              onChange({ ...value, availabilityNotes: event.target.value })
            }
            value={value.availabilityNotes}
          />
        </Box>
      </Box>
    </Box>
  );
}
