import { Box, Button, Container, TextField, Typography } from '@mui/material';
import { useState } from 'react';

type ApplicantType = 'business' | 'private';

interface ApplicantFormProps {
  applicantType: ApplicantType;
}

export default function ApplicantForm({ applicantType }: ApplicantFormProps) {
  const isBusiness = applicantType === 'business';
  const [phoneError, setPhoneError] = useState(false);
  const [cvrError, setCvrError] = useState(false);
  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    console.log({
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      cvr: isBusiness ? formData.get('cvr') : null,
    });
  }

  return (
    <Container maxWidth="md">
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 5 }}>
        <Typography sx={{ mb: 4 }} variant="h4">
          Opret ansøger
        </Typography>

        <TextField
          disabled
          fullWidth
          label="Ansøgertype"
          sx={{ mb: 3 }}
          value={isBusiness ? 'Erhverv' : 'Privat'}
        />

        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
          }}
        >
          <TextField
            label="Navn"
            name="name"
            placeholder={isBusiness ? 'Virksomhedens navn' : 'Fulde navn'}
            required
          />

          <TextField
            error={phoneError}
            helperText={
              phoneError ? 'Telefonnummer skal bestå af præcis 8 cifre' : ''
            }
            label="Telefonnummer"
            name="phone"
            onBlur={(event) => {
              const value = event.target.value;
              setPhoneError(!/^\d{8}$/.test(value));
            }}
            onChange={(event) => {
              if (phoneError) {
                setPhoneError(!/^\d{8}$/.test(event.target.value));
              }
            }}
            placeholder="8 cifre"
            required
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]{8}',
                maxLength: 8,
              },
            }}
          />

          <TextField
            label="E-mail"
            name="email"
            placeholder="E-mailadresse"
            required
            type="email"
          />

          <TextField
            label="Adresse"
            name="address"
            placeholder="Søg efter adresse..."
            required
          />

          {isBusiness && (
            <TextField
              error={cvrError}
              helperText={
                cvrError ? 'CVR-nummer skal bestå af præcis 8 cifre' : ''
              }
              label="CVR-nummer"
              name="cvr"
              onBlur={(event) => {
                setCvrError(!/^\d{8}$/.test(event.target.value));
              }}
              onChange={(event) => {
                if (cvrError) {
                  setCvrError(!/^\d{8}$/.test(event.target.value));
                }
              }}
              placeholder="8 cifre"
              required
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                  pattern: '[0-9]{8}',
                  maxLength: 8,
                },
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
            mt: 5,
          }}
        >
          <Button variant="outlined">Annuller</Button>

          <Button type="submit" variant="contained">
            Gem ansøger
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
