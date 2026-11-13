import { describe, expect, it } from 'bun:test';
import { isValidCvrNumber, isValidPhoneNumber } from './applicant-validation.js';

describe('isValidPhoneNumber', () => {
  it('accepts an 8-digit value', () => {
    expect(isValidPhoneNumber('12345678')).toBe(true);
  });

  it('rejects values that are not exactly 8 digits', () => {
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber('1234')).toBe(false);
    expect(isValidPhoneNumber('123456789')).toBe(false);
    expect(isValidPhoneNumber('12 345678')).toBe(false);
    expect(isValidPhoneNumber('abcdefgh')).toBe(false);
  });
});

describe('isValidCvrNumber', () => {
  it('accepts an 8-digit value', () => {
    expect(isValidCvrNumber('12345678')).toBe(true);
  });

  it('rejects values that are not exactly 8 digits', () => {
    expect(isValidCvrNumber('')).toBe(false);
    expect(isValidCvrNumber('1234')).toBe(false);
    expect(isValidCvrNumber('123456789')).toBe(false);
    expect(isValidCvrNumber('12 345678')).toBe(false);
    expect(isValidCvrNumber('abcdefgh')).toBe(false);
  });
});

