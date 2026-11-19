import { describe, expect, test } from 'bun:test';
import type { ContactPersonFormValues } from '../../types/contact-person.types.js';
import { ApplicationType, Availability } from '../../types/prisma-enums.js';
import {
  canDeleteContactPerson,
  canEditContactPersons,
  normalizeEmailInput,
  normalizePhoneInput,
  toContactPersonInput,
  validateContactPerson,
} from './contact-person-validation.js';

const completeValues: ContactPersonFormValues = {
  name: 'Jens Jensen',
  availability: Availability.Day,
  phoneNumber: '12345678',
  email: 'jens@example.com',
};

describe('validateContactPerson', () => {
  test('accepts a complete contact person', () => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, completeValues),
    ).toEqual({});
  });

  test('requires the name (UC-031 F1)', () => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        name: '  ',
      }),
    ).toEqual({ name: 'required' });
  });

  test('requires an availability for excavation permits (UC-031 F2)', () => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        availability: '',
      }),
    ).toEqual({ availability: 'required' });
  });

  test('does not require an availability for road use (UC-031 A1)', () => {
    expect(
      validateContactPerson(ApplicationType.RoadUsePermit, {
        ...completeValues,
        availability: '',
      }),
    ).toEqual({});
  });

  test('requires an 8 digit phone number (UC-031 F3)', () => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        phoneNumber: '1234',
      }),
    ).toEqual({ phoneNumber: 'phoneNumber' });
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        phoneNumber: '',
      }),
    ).toEqual({ phoneNumber: 'required' });
  });

  test('requires a valid email format (UC-031 F4)', () => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        email: 'jens@firma',
      }),
    ).toEqual({ email: 'email' });
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        email: '',
      }),
    ).toEqual({ email: 'required' });
  });

  test.each([
    'jens,jensen@firma.dk',
    'jens@firma,dk',
    'jens!@firma.dk',
    'søren@firma.dk',
    'jens..jensen@firma.dk',
    'jens@-firma.dk',
  ])('rejects the email %s', (email) => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        email,
      }),
    ).toEqual({ email: 'email' });
  });

  test.each([
    'jens.jensen@firma.co.uk',
    'jens+test@sub.firma.dk',
    'jens_jensen-1@mit-firma.dk',
  ])('accepts the email %s', (email) => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        email,
      }),
    ).toEqual({});
  });
});

describe('toContactPersonInput', () => {
  test('sends the chosen availability for excavation permits', () => {
    expect(
      toContactPersonInput(ApplicationType.ExcavationPermit, completeValues),
    ).toEqual({
      name: 'Jens Jensen',
      availability: Availability.Day,
      phoneNumber: '12345678',
      email: 'jens@example.com',
    });
  });

  test('omits availability for road use applications (UC-031 A1)', () => {
    expect(
      toContactPersonInput(ApplicationType.RoadUsePermit, completeValues),
    ).toEqual({
      name: 'Jens Jensen',
      phoneNumber: '12345678',
      email: 'jens@example.com',
    });
  });

  test('trims the entered text', () => {
    expect(
      toContactPersonInput(ApplicationType.RoadUsePermit, {
        ...completeValues,
        name: ' Jens Jensen ',
        email: ' jens@example.com ',
      }),
    ).toMatchObject({ name: 'Jens Jensen', email: 'jens@example.com' });
  });
});

describe('canEditContactPersons', () => {
  test('allows drafts and applications that require changes', () => {
    expect(canEditContactPersons('Draft')).toBe(true);
    expect(canEditContactPersons('ChangeRequired')).toBe(true);
    expect(canEditContactPersons('Approved')).toBe(false);
    expect(canEditContactPersons('InProgress')).toBe(false);
  });
});

describe('canDeleteContactPerson', () => {
  test('keeps the last contact person (UC-032 F1)', () => {
    expect(canDeleteContactPerson(1)).toBe(false);
    expect(canDeleteContactPerson(2)).toBe(true);
  });
});

describe('normalizePhoneInput', () => {
  test.each([
    ['12345678', '12345678'],
    ['22 33 44 55', '22334455'],
    ['22-33-44-55', '22334455'],
    ['+45 22 33 44 55', '22334455'],
    ['0045 22334455', '22334455'],
    ['abc', ''],
    ['1234', '1234'],
  ])('turns %p into %p', (input, expected) => {
    expect(normalizePhoneInput(input)).toBe(expected);
  });

  test('keeps a number that is too long, so the validation can reject it', () => {
    expect(normalizePhoneInput('1234567890')).toBe('1234567890');
  });
});

describe('normalizeEmailInput', () => {
  test('removes spaces', () => {
    expect(normalizeEmailInput(' jens @firma.dk ')).toBe('jens@firma.dk');
  });
});

describe('email format', () => {
  test.each([
    'jens@@firma.dk',
    'jens@firma..dk',
    'jens@firma.dk.',
    'jens@.dk',
    'jens@firma',
  ])('rejects %p', (email) => {
    expect(
      validateContactPerson(ApplicationType.ExcavationPermit, {
        ...completeValues,
        email,
      }),
    ).toEqual({ email: 'email' });
  });

  test.each(['jens@firma.dk', 'jens.jensen@firma.co.uk'])(
    'accepts %p',
    (email) => {
      expect(
        validateContactPerson(ApplicationType.ExcavationPermit, {
          ...completeValues,
          email,
        }),
      ).toEqual({});
    },
  );
});
