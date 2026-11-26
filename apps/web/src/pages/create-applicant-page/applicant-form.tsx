import { Box, Button, Container, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { AddressSuggestion } from '../../api/addresses.api.js';
import AddressAutocomplete from '../../components/address/address-autocomplete.js';
import {
  ApplicantSaveError,
  applicantSaveError,
  useApplicants,
} from '../../hooks/use-applicants.js';
import { parseAddress } from './address-parser.js';
import {
  isValidCvrNumber,
  isValidPhoneNumber,
} from './applicant-validation.js';

type ApplicantType = 'business' | 'private';
type ApplicantField =
  | 'name'
  | 'email'
  | 'phoneNumber'
  | 'address'
  | 'cvrNumber';

interface ApplicantFormProps {
  applicantType: ApplicantType;
}

/**
 * Renders the creation form with fields for the chosen applicant type.
 *
 * @param props - Applicant type used to configure the form.
 * @returns The applicant form with address lookup and field validation.
 */
export default function ApplicantForm({ applicantType }: ApplicantFormProps) {
  const isBusiness = applicantType === 'business';
  const title = isBusiness ? 'Opret erhvervsansøger' : 'Opret privatansøger';
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);
  const navigate = useNavigate();
  const { createApplicant } = useApplicants();
  const [errors, setErrors] = useState<Partial<Record<ApplicantField, string>>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Dismisses the validation message when its field changes.
   *
   * @param field - Field whose error should be cleared.
   */
  function clearError(field: ApplicantField): void {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  /**
   * Validates the form and saves the applicant when all fields are valid.
   *
   * @param event - Submit event for the applicant form.
   */
  async function handleSubmit(
    event: React.SubmitEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (isSaving) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const phoneNumber = String(formData.get('phone') ?? '').trim();
    const cvrNumber = String(formData.get('cvr') ?? '').trim();
    const nextErrors: Partial<Record<ApplicantField, string>> = {};
    const nameInput = form.elements.namedItem('name');
    const emailInput = form.elements.namedItem('email');

    if (!name) {
      nextErrors.name = isBusiness
        ? 'Indtast virksomhedens navn.'
        : 'Indtast dit fulde navn.';
    } else if (
      nameInput instanceof HTMLInputElement &&
      !nameInput.validity.valid
    ) {
      nextErrors.name = isBusiness
        ? 'Brug kun bogstaver, tal og mellemrum i virksomhedens navn.'
        : 'Brug kun bogstaver og mellemrum i dit navn.';
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      nextErrors.phoneNumber = 'Indtast et telefonnummer med præcis 8 cifre.';
    }
    if (
      !email ||
      (emailInput instanceof HTMLInputElement && !emailInput.validity.valid)
    )
      nextErrors.email =
        'Indtast en gyldig e-mailadresse, fx navn@eksempel.dk.';
    if (!selectedAddress) {
      nextErrors.address = 'Vælg en adresse med husnummer fra listen.';
    }
    if (isBusiness && !isValidCvrNumber(cvrNumber)) {
      nextErrors.cvrNumber = 'Indtast et CVR-nummer med præcis 8 cifre.';
    }

    setErrors(nextErrors);
    setSubmitError(null);
    if (!selectedAddress || Object.keys(nextErrors).length > 0) return;

    let address: ReturnType<typeof parseAddress>;
    try {
      address = parseAddress(selectedAddress);
    } catch (error) {
      setErrors({
        address:
          error instanceof Error
            ? error.message
            : 'Vælg en anden adresse fra listen.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await createApplicant({
        name,
        type: applicantType,
        phoneNumber,
        email,
        ...(isBusiness ? { cvrNumber } : {}),
        ...address,
      });

      navigate('/');
    } catch (error) {
      if (error instanceof ApplicantSaveError && error.field) {
        setErrors({ [error.field]: error.message });
      } else {
        setSubmitError(
          error instanceof Error ? error.message : applicantSaveError,
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Container className="applicant-form" component="main" maxWidth="md">
      <title>{title}</title>
      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 5 }}>
        <Typography component="h1" sx={{ mb: 4 }} variant="h4">
          {title}
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
            columnGap: { xs: 2, md: 5 },
            rowGap: 3,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          <TextField
            error={Boolean(errors.name)}
            helperText={errors.name}
            label="Navn"
            name="name"
            onChange={() => clearError('name')}
            placeholder={isBusiness ? 'Virksomhedens navn' : 'Fulde navn'}
            required
            slotProps={{
              htmlInput: {
                pattern: isBusiness
                  ? /(?:\p{L}\p{M}*|[0-9])+(?: +(?:\p{L}\p{M}*|[0-9])+)*/u
                      .source
                  : /(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*/u.source,
                title: isBusiness
                  ? 'Brug bogstaver, tal og mellemrum mellem ord.'
                  : 'Brug bogstaver og mellemrum mellem ord.',
              },
            }}
          />

          <TextField
            error={Boolean(errors.phoneNumber)}
            helperText={errors.phoneNumber}
            label="Telefonnummer"
            name="phone"
            onChange={() => clearError('phoneNumber')}
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
            error={Boolean(errors.email)}
            helperText={errors.email}
            label="E-mail"
            name="email"
            onChange={() => clearError('email')}
            placeholder="E-mailadresse"
            required
            slotProps={{
              htmlInput: { pattern: /[^@]+@[^@+]+\.[^@+]+/.source },
            }}
            type="email"
          />

          <AddressAutocomplete
            errorMessage={errors.address}
            onChange={(selection) => {
              setSelectedAddress(selection);
              clearError('address');
            }}
          />

          {isBusiness && (
            <TextField
              error={Boolean(errors.cvrNumber)}
              helperText={errors.cvrNumber}
              label="CVR-nummer"
              name="cvr"
              onChange={() => clearError('cvrNumber')}
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
          <Typography color="error" role="alert" sx={{ mt: 3 }}>
            {submitError}
          </Typography>
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
