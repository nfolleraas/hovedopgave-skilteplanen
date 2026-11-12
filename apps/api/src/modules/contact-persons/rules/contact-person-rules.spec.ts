import {
  ApplicationType,
  Availability,
  Status,
} from '../../../generated/prisma/enums.js';
import {
  canEditContactPersons,
  findInvalidContactPersonFields,
  getContactPersonFieldSet,
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
    for (const email of ['', 'jens', 'jens@firma', 'jens firma@a.dk']) {
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
