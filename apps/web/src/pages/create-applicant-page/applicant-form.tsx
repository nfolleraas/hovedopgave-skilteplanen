import {
  Alert,
  Box,
  Button,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { AddressSuggestion } from '../../api/addresses.api.js';
import AddressAutocomplete from '../../components/address/address-autocomplete.js';
import { useApplicants } from '../../hooks/use-applicants.js';
import { parseAddress } from './address-parser.js';

type ApplicantType = 'business' | 'private';

interface ApplicantFormProps {
  applicantType: ApplicantType;
}

export default function ApplicantForm({ applicantType }: ApplicantFormProps) {
  const isBusiness = applicantType === 'business';
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);
  const navigate = useNavigate();
  const { createApplicant } = useApplicants();
  const [phoneError, setPhoneError] = useState(false);
  const [cvrError, setCvrError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAddress) {
      setSubmitError('Du skal vælge en adresse fra listen.');
      return;
    }

    const formData = new FormData(event.currentTarget);

    setSubmitError(null);
    setIsSaving(true);

    try {
      await createApplicant({
        name: String(formData.get('name') ?? '').trim(),
        type: applicantType,
        phoneNumber: String(formData.get('phone') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim(),
        ...(isBusiness
          ? { cvrNumber: String(formData.get('cvr') ?? '').trim() }
          : {}),
        ...parseAddress(selectedAddress),
      });

      navigate('/');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Kunne ikke gemme ansøger.',
      );
    } finally {
      setIsSaving(false);
    }
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

          <AddressAutocomplete onChange={setSelectedAddress} />

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

        {submitError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {submitError}
          </Alert>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
            mt: 5,
          }}
        >
          <Button
            onClick={() => navigate('/')}
            type="button"
            variant="outlined"
          >
            Annuller
          </Button>

          <Button disabled={isSaving} type="submit" variant="contained">
            {isSaving ? 'Gemmer...' : 'Gem ansøger'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
