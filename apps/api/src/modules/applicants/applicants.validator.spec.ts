import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  validateCreateApplicant,
  validateProfile,
} from './applicants.validator.js';
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

  it('accepts Danish address names and a house number suffix', () => {
    expect(() =>
      validateCreateApplicant({
        ...validApplicant,
        street: 'Sct. Jørgens Vej',
        houseNumber: '12A',
        postalCode: '5000',
        city: 'Odense C',
      }),
    ).not.toThrow();
  });

  it.each([
    { street: 'Vestergade 😊' },
    { street: '   ' },
    { houseNumber: 'Vestergade' },
    { postalCode: 'abc' },
    { postalCode: '😊' },
    { postalCode: '80000' },
    { city: 'Aarhus 😊' },
  ])('rejects an invalid address field %j', (address) => {
    expect(() =>
      validateCreateApplicant({ ...validApplicant, ...address }),
    ).toThrow(BadRequestException);
  });

  it('accepts Danish letters in both flows', () => {
    const data = {
      ...validApplicant,
      name: 'Søren Ærø',
      email: 'kontakt.test@example.dk',
    };
    expect(() => validateCreateApplicant(data)).not.toThrow();
    expect(validateProfile(data, false)).toMatchObject({
      name: data.name,
      email: data.email,
    });
  });

  it.each([
    { name: 'Søren 😊' },
    { name: 'Søren!' },
    { name: 'Søren 2' },
    { email: 'kontakt😊@example.dk' },
    { email: 'kontakt+test@example.dk' },
    { email: 'kontakt@example' },
  ])('rejects invalid applicant fields %j in both flows', (input) => {
    const data = { ...validApplicant, ...input };
    expect(() => validateCreateApplicant(data)).toThrow(BadRequestException);
    expect(() => validateProfile(data, false)).toThrow(BadRequestException);
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
