import { describe, expect, test } from 'bun:test';
import type { Area, AreaFormValues } from '../../types/area.types.js';
import { ApplicationType, Status } from '../../types/prisma-enums.js';
import {
  calculateAreaInSquareMeters,
  canDeleteArea,
  canEditAreas,
  emptyAreaFormValues,
  formatSquareMeters,
  getAreaFieldSet,
  parseDecimal,
  toAreaFormValues,
  toAreaInput,
  validateArea,
} from './area-validation.js';

const complete: AreaFormValues = {
  ...emptyAreaFormValues,
  roadName: 'Strandvej',
  roadOwnership: 'Municipality',
  postalCode: '5000',
  houseNumberFrom: '10',
  houseNumberTo: '24',
  roadSection: 'Pavement',
  roadSide: 'Right',
  direction: 'Along',
  lengthInMeters: '18',
  widthInMeters: '0,6',
  depthInMeters: '1,2',
};

const searched = { includeRoad: false };

describe('house numbers or alternative description (UC-034 F1)', () => {
  test('house numbers alone are enough', () => {
    expect(
      validateArea(ApplicationType.ExcavationPermit, complete, searched),
    ).toEqual({});
  });

  test('a description alone is enough', () => {
    const values = {
      ...complete,
      houseNumberFrom: '',
      houseNumberTo: '',
      alternativeDescription: 'Ud for havnen',
    };
    expect(
      validateArea(ApplicationType.ExcavationPermit, values, searched),
    ).toEqual({});
  });

  test('one of them is required', () => {
    const values = { ...complete, houseNumberFrom: '', houseNumberTo: '' };
    expect(
      validateArea(ApplicationType.ExcavationPermit, values, searched),
    ).toEqual({
      houseNumberFrom: 'houseNumberOrDescription',
      houseNumberTo: 'houseNumberOrDescription',
      alternativeDescription: 'houseNumberOrDescription',
    });
  });

  test('both house numbers are needed without a description', () => {
    const values = { ...complete, houseNumberTo: '' };
    expect(
      Object.keys(
        validateArea(ApplicationType.ExcavationPermit, values, searched),
      ),
    ).toEqual(['houseNumberTo']);
  });
});

describe('fields per application type', () => {
  const withoutDirectionAndDepth = {
    ...complete,
    direction: '' as const,
    depthInMeters: '',
  };

  test('excavation permits require direction and depth', () => {
    expect(
      validateArea(
        ApplicationType.ExcavationPermit,
        withoutDirectionAndDepth,
        searched,
      ),
    ).toEqual({ direction: 'required', depthInMeters: 'required' });
  });

  test('containers skip direction and depth (UC-034 A1)', () => {
    expect(
      validateArea(
        ApplicationType.RoadUsePermit,
        withoutDirectionAndDepth,
        searched,
      ),
    ).toEqual({});
    const input = toAreaInput(
      ApplicationType.RoadUsePermit,
      complete,
      searched,
    );
    expect(input).not.toHaveProperty('direction');
    expect(input).not.toHaveProperty('depthInMeters');
  });

  test('manual roads require street name, road status and postal code', () => {
    expect(
      validateArea(
        ApplicationType.RoadUsePermit,
        {
          ...withoutDirectionAndDepth,
          roadName: '',
          roadOwnership: '',
          postalCode: '50',
        },
        { includeRoad: true },
      ),
    ).toEqual({
      roadName: 'required',
      roadOwnership: 'required',
      postalCode: 'postalCode',
    });
  });

  test('sizes must be greater than 0', () => {
    const values = { ...complete, lengthInMeters: '0', widthInMeters: 'abc' };
    expect(
      validateArea(ApplicationType.ExcavationPermit, values, searched),
    ).toEqual({
      lengthInMeters: 'positiveNumber',
      widthInMeters: 'positiveNumber',
    });
  });
});

describe('area calculation', () => {
  test('parses Danish decimal commas', () => {
    expect(parseDecimal('0,6')).toBe(0.6);
    expect(parseDecimal('1.2')).toBe(1.2);
    expect(parseDecimal('1,2,3')).toBeUndefined();
  });

  test('area is length times width with one decimal and a comma', () => {
    const area = calculateAreaInSquareMeters('18', '0,6');
    expect(area).toBeCloseTo(10.8);
    expect(formatSquareMeters(area ?? 0)).toBe('10,8');
    expect(calculateAreaInSquareMeters('18', '')).toBeUndefined();
  });
});

test('the last area cannot be deleted (UC-035 F1)', () => {
  expect(canDeleteArea(1)).toBe(false);
  expect(canDeleteArea(2)).toBe(true);
});

describe('rules per application', () => {
  test('only excavation permits use direction and depth', () => {
    expect(getAreaFieldSet(ApplicationType.ExcavationPermit)).toEqual({
      direction: true,
      depth: true,
    });
    expect(getAreaFieldSet(ApplicationType.RoadUsePermit)).toEqual({
      direction: false,
      depth: false,
    });
  });

  test('areas can only change while the application is a draft or needs changes', () => {
    expect(canEditAreas(Status.Draft)).toBe(true);
    expect(canEditAreas(Status.ChangeRequired)).toBe(true);
    expect(canEditAreas(Status.InProgress)).toBe(false);
    expect(canEditAreas(Status.Approved)).toBe(false);
    expect(canEditAreas(Status.Rejected)).toBe(false);
  });
});

describe('more validation', () => {
  test('road element Other needs a description', () => {
    const values = { ...complete, roadSection: 'Other' as const };
    expect(
      validateArea(ApplicationType.ExcavationPermit, values, searched),
    ).toEqual({ roadSectionDescription: 'required' });
    expect(
      validateArea(
        ApplicationType.ExcavationPermit,
        { ...values, roadSectionDescription: 'Parkeringsplads' },
        searched,
      ),
    ).toEqual({});
  });

  test('an empty form lists every required field', () => {
    expect(
      validateArea(ApplicationType.ExcavationPermit, emptyAreaFormValues, {
        includeRoad: true,
      }),
    ).toEqual({
      roadName: 'required',
      roadOwnership: 'required',
      postalCode: 'required',
      houseNumberFrom: 'houseNumberOrDescription',
      houseNumberTo: 'houseNumberOrDescription',
      alternativeDescription: 'houseNumberOrDescription',
      roadSection: 'required',
      roadSide: 'required',
      direction: 'required',
      lengthInMeters: 'required',
      widthInMeters: 'required',
      depthInMeters: 'required',
    });
  });

  test('blank text counts as missing', () => {
    const values = {
      ...complete,
      houseNumberFrom: '  ',
      houseNumberTo: ' ',
      lengthInMeters: ' ',
    };
    expect(
      validateArea(ApplicationType.ExcavationPermit, values, searched),
    ).toEqual({
      houseNumberFrom: 'houseNumberOrDescription',
      houseNumberTo: 'houseNumberOrDescription',
      alternativeDescription: 'houseNumberOrDescription',
      lengthInMeters: 'required',
    });
  });

  test('a postal code with spaces around it is accepted', () => {
    expect(
      validateArea(
        ApplicationType.ExcavationPermit,
        { ...complete, postalCode: ' 5000 ' },
        { includeRoad: true },
      ),
    ).toEqual({});
  });

  test('searched roads skip the road fields', () => {
    expect(
      validateArea(
        ApplicationType.ExcavationPermit,
        { ...complete, roadName: '', roadOwnership: '', postalCode: '' },
        searched,
      ),
    ).toEqual({});
  });

  test('negative numbers and text are not sizes', () => {
    expect(parseDecimal('-1')).toBeUndefined();
    expect(parseDecimal('')).toBeUndefined();
    expect(parseDecimal('2 m')).toBeUndefined();
    expect(parseDecimal(' 2,5 ')).toBe(2.5);
  });
});

describe('form values (UC-036)', () => {
  const saved: Area = {
    uuid: 'a1',
    applicationId: 'APP-1',
    roadName: 'Strandvej',
    roadOwnership: 'Municipality',
    postalCode: '5000',
    houseNumberFrom: null,
    houseNumberTo: null,
    alternativeDescription: 'Ud for havnen',
    roadSection: null,
    roadSectionDescription: null,
    roadSide: 'Left',
    direction: null,
    lengthInMeters: 18,
    widthInMeters: 0.6,
    depthInMeters: null,
    areaInSquareMeters: 10.8,
  };

  test('a saved area becomes text with Danish decimal commas', () => {
    expect(toAreaFormValues(saved)).toEqual({
      roadName: 'Strandvej',
      roadOwnership: 'Municipality',
      postalCode: '5000',
      houseNumberFrom: '',
      houseNumberTo: '',
      alternativeDescription: 'Ud for havnen',
      roadSection: '',
      roadSectionDescription: '',
      roadSide: 'Left',
      direction: '',
      lengthInMeters: '18',
      widthInMeters: '0,6',
      depthInMeters: '',
    });
  });

  test('a form that is saved without changes sends the same values', () => {
    const input = toAreaInput(
      ApplicationType.ExcavationPermit,
      toAreaFormValues(saved),
      searched,
    );
    expect(input).toMatchObject({
      alternativeDescription: 'Ud for havnen',
      roadSide: 'Left',
      lengthInMeters: 18,
      widthInMeters: 0.6,
    });
  });
});

describe('request body', () => {
  test('a searched road only sends the details', () => {
    expect(
      toAreaInput(ApplicationType.ExcavationPermit, complete, searched),
    ).toEqual({
      houseNumberFrom: '10',
      houseNumberTo: '24',
      alternativeDescription: null,
      roadSection: 'Pavement',
      roadSectionDescription: null,
      roadSide: 'Right',
      direction: 'Along',
      lengthInMeters: 18,
      widthInMeters: 0.6,
      depthInMeters: 1.2,
    });
  });

  test('a manual road also sends the trimmed road fields (UC-034 A3)', () => {
    const input = toAreaInput(
      ApplicationType.RoadUsePermit,
      { ...complete, roadName: ' Ny vej ', postalCode: ' 5200 ' },
      { includeRoad: true },
    );
    expect(input).toMatchObject({
      roadName: 'Ny vej',
      roadOwnership: 'Municipality',
      postalCode: '5200',
    });
  });

  test('empty fields are sent as null', () => {
    const input = toAreaInput(
      ApplicationType.ExcavationPermit,
      emptyAreaFormValues,
      searched,
    );
    expect(input).toEqual({
      houseNumberFrom: null,
      houseNumberTo: null,
      alternativeDescription: null,
      roadSection: null,
      roadSectionDescription: null,
      roadSide: null,
      direction: null,
      lengthInMeters: null,
      widthInMeters: null,
      depthInMeters: null,
    });
  });

  test('the road element description is only sent for Other', () => {
    const withDescription = {
      ...complete,
      roadSectionDescription: '  Parkeringsplads ',
    };
    expect(
      toAreaInput(ApplicationType.ExcavationPermit, withDescription, searched)
        .roadSectionDescription,
    ).toBeNull();
    expect(
      toAreaInput(
        ApplicationType.ExcavationPermit,
        { ...withDescription, roadSection: 'Other' },
        searched,
      ).roadSectionDescription,
    ).toBe('Parkeringsplads');
  });
});
