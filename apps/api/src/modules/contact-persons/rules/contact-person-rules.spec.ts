import {
  ApplicationType,
  Availability,
  Status,
} from '../../../generated/prisma/enums.js';
import {
  canDeleteContactPerson,
  canEditContactPersons,
  findInvalidContactPersonFields,
  getContactPersonFieldSet,
  trimContactPersonText,
} from './contact-person-rules.js';

const completeInput = {
  name: 'Jens Jensen',
  availability: Availability.Day,
  phoneNumber: '12345678',
  email: 'jens@example.com',
};

describe('getContactPersonFieldSet', () => {
  it('lets excavation permits choose an availability (UC-031)', () => {
    expect(getContactPersonFieldSet(ApplicationType.ExcavationPermit)).toEqual({
      availability: true,
    });
  });

  it('fixes availability for road use applications (UC-031 A1)', () => {
    expect(getContactPersonFieldSet(ApplicationType.RoadUsePermit)).toEqual({
      availability: false,
    });
    expect(
      getContactPersonFieldSet(ApplicationType.RoadUsePermitEvent),
    ).toEqual({ availability: false });
  });
});

describe('canEditContactPersons', () => {
  it('allows drafts and applications that require changes', () => {
    expect(canEditContactPersons(Status.Draft)).toBe(true);
    expect(canEditContactPersons(Status.ChangeRequired)).toBe(true);
  });

  it('rejects the other statuses', () => {
    expect(canEditContactPersons(Status.InProgress)).toBe(false);
    expect(canEditContactPersons(Status.Approved)).toBe(false);
    expect(canEditContactPersons(Status.Rejected)).toBe(false);
  });
});

describe('trimContactPersonText', () => {
  it('removes spaces around the name and email', () => {
    expect(
      trimContactPersonText({ name: '  Jens  ', email: ' jens@firma.dk ' }),
    ).toEqual({ name: 'Jens', email: 'jens@firma.dk' });
  });

  it('leaves out fields that were not sent', () => {
    expect(trimContactPersonText({ phoneNumber: '12345678' })).toEqual({
      phoneNumber: '12345678',
    });
  });
});

describe('canDeleteContactPerson', () => {
  it('keeps the last contact person on the application (UC-032 F1)', () => {
    expect(canDeleteContactPerson(1)).toBe(false);
    expect(canDeleteContactPerson(2)).toBe(true);
  });
});

describe('findInvalidContactPersonFields', () => {
  it('accepts a complete contact person', () => {
    expect(
      findInvalidContactPersonFields(
        ApplicationType.ExcavationPermit,
        completeInput,
      ),
    ).toEqual([]);
  });

  it('requires the name (UC-031 F1)', () => {
    expect(
      findInvalidContactPersonFields(ApplicationType.ExcavationPermit, {
        ...completeInput,
        name: '  ',
      }),
    ).toEqual(['name']);
  });

  it('requires an availability for excavation permits (UC-031 F2)', () => {
    expect(
      findInvalidContactPersonFields(ApplicationType.ExcavationPermit, {
        ...completeInput,
        availability: null,
      }),
    ).toEqual(['availability']);
  });

  it('does not require an availability for road use applications', () => {
    expect(
      findInvalidContactPersonFields(ApplicationType.RoadUsePermit, {
        ...completeInput,
        availability: null,
      }),
    ).toEqual([]);
  });

  it('requires an 8 digit phone number (UC-031 F3)', () => {
    for (const phoneNumber of ['', '1234567', '123456789', '1234567a']) {
      expect(
        findInvalidContactPersonFields(ApplicationType.ExcavationPermit, {
          ...completeInput,
          phoneNumber,
        }),
      ).toEqual(['phoneNumber']);
    }
  });

  it('requires a valid email format (UC-031 F4)', () => {
    for (const email of [
      '',
      'jens',
      'jens@firma',
      'jens firma@a.dk',
      'jens@@firma.dk',
      'jens@firma..dk',
      'jens@firma.dk.',
      'jens@.dk',
      'jens,jensen@firma.dk',
      'jens@firma,dk',
      'jens;@firma.dk',
      'jens!@firma.dk',
      'jens"@firma.dk',
      'søren@firma.dk',
      'jens@firmæ.dk',
      '.jens@firma.dk',
      'jens.@firma.dk',
      'jens..jensen@firma.dk',
      'jens@-firma.dk',
      'jens@firma-.dk',
      'jens@firma.d',
      'jens@firma.d1',
    ]) {
      expect(
        findInvalidContactPersonFields(ApplicationType.ExcavationPermit, {
          ...completeInput,
          email,
        }),
      ).toEqual(['email']);
    }
  });

  it('lists every missing field', () => {
    expect(
      findInvalidContactPersonFields(ApplicationType.ExcavationPermit, {}),
    ).toEqual(['name', 'availability', 'phoneNumber', 'email']);
  });
});

describe('email format', () => {
  it('accepts ordinary addresses', () => {
    for (const email of [
      'jens@firma.dk',
      'jens.jensen@firma.co.uk',
      'jens+test@sub.firma.dk',
      'jens_jensen-1@mit-firma.dk',
      'JENS@FIRMA.DK',
    ]) {
      expect(
        findInvalidContactPersonFields(ApplicationType.ExcavationPermit, {
          ...completeInput,
          email,
        }),
      ).toEqual([]);
    }
  });
});
