import { describe, expect, test } from 'bun:test';
import type { AreaFormValues } from '../../types/area.types.js';
import { ApplicationType } from '../../types/prisma-enums.js';
import {
  calculateAreaInSquareMeters,
  canDeleteArea,
  emptyAreaFormValues,
  formatSquareMeters,
  parseDecimal,
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

  test('events need no detail fields (UC-034 A2)', () => {
    expect(
      validateArea(
        ApplicationType.RoadUsePermitEvent,
        emptyAreaFormValues,
        searched,
      ),
    ).toEqual({});
    expect(
      toAreaInput(ApplicationType.RoadUsePermitEvent, complete, searched),
    ).toEqual({});
  });

  test('manual roads require street name, road status and postal code', () => {
    expect(
      validateArea(
        ApplicationType.RoadUsePermitEvent,
        { ...emptyAreaFormValues, postalCode: '50' },
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
