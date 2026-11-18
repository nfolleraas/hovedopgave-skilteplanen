import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  validateCreateMunicipality,
  validateUpdateMunicipality,
} from './municipalities.validator.js';

const validMunicipality = {
  id: 1,
  name: 'Odense Kommune',
  region: 'Syddanmark',
  email: 'kontakt@odense.dk',
  phoneNumber: '12345678',
  address: {
    street: 'Flakhaven',
    houseNumber: '2',
    postalCode: '5000',
    city: 'Odense C',
  },
};

describe('validateCreateMunicipality', () => {
  it('accepterer gyldige oplysninger', () => {
    expect(() => validateCreateMunicipality(validMunicipality)).not.toThrow(
      BadRequestException,
    );
  });

  it('afviser felter med en forkert type', () => {
    expect(() =>
      validateCreateMunicipality({ ...validMunicipality, region: 123 }),
    ).toThrow(BadRequestException);
  });

  it('afviser ugyldig email', () => {
    expect(() =>
      validateCreateMunicipality({
        ...validMunicipality,
        email: 'ugyldig-email',
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser telefonnummer med 7 cifre', () => {
    expect(() =>
      validateCreateMunicipality({
        ...validMunicipality,
        phoneNumber: '1234567',
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser manglende adresse', () => {
    expect(() =>
      validateCreateMunicipality({
        ...validMunicipality,
        address: undefined,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('validateUpdateMunicipality', () => {
  it('accepterer adresse og kontaktoplysninger uden navn', () => {
    const { email, phoneNumber, address } = validMunicipality;

    expect(() =>
      validateUpdateMunicipality({ email, phoneNumber, address }),
    ).not.toThrow();
  });

  it('afviser ugyldig email', () => {
    expect(() =>
      validateUpdateMunicipality({
        ...validMunicipality,
        email: 'ugyldig-email',
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser telefonnummer med 7 cifre', () => {
    expect(() =>
      validateUpdateMunicipality({
        ...validMunicipality,
        phoneNumber: '1234567',
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser manglende adresse', () => {
    expect(() =>
      validateUpdateMunicipality({
        ...validMunicipality,
        address: undefined,
      }),
    ).toThrow(BadRequestException);
  });
});
