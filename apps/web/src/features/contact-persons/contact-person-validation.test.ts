import { describe, expect, test } from 'bun:test';
import type { ContactPersonFormValues } from '../../types/contact-person.types.js';
import { ApplicationType, Availability } from '../../types/prisma-enums.js';
import {
  canEditContactPersons,
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
