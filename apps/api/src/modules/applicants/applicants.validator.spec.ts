import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validateCreateApplicant } from './applicants.validator.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

describe('validateCreateApplicant', () => {
  const validApplicant: CreateApplicantDto = {
    name: 'Testperson',
    type: 'private',
    phoneNumber: '12345678',
    email: 'test@example.com',
    street: 'Vestergade',
    houseNumber: '1',
    postalCode: '8000',
    city: 'Aarhus C',
  };

  it('accepts a valid private applicant', () => {
    expect(() => validateCreateApplicant(validApplicant)).not.toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() =>
      validateCreateApplicant({
        ...validApplicant,
        email: 'invalid',
      }),
    ).toThrow(BadRequestException);
  });

  it('requires CVR number for business applicants', () => {
    expect(() =>
      validateCreateApplicant({
        ...validApplicant,
        type: 'business',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects phone numbers with the wrong length', () => {
    expect(() =>
      validateCreateApplicant({
        ...validApplicant,
        phoneNumber: '1234',
      }),
    ).toThrow(BadRequestException);
  });
});
