import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAreaDto } from './create-area.dto.js';
import { CreateAreasDto } from './create-areas.dto.js';
import { UpdateAreaDto } from './update-area.dto.js';

const road = {
  roadName: 'Strandvej',
  roadOwnership: 'Municipality',
  postalCode: '5000',
};

/** Validates like the global ValidationPipe and returns the failed fields. */
async function invalidFields<T extends object>(
  dtoClass: new () => T,
  body: object,
): Promise<string[]> {
  const errors = await validate(plainToInstance(dtoClass, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const collect = (list: typeof errors, prefix: string): string[] =>
    list.flatMap((error) => {
      const path = prefix ? `${prefix}.${error.property}` : error.property;
      return error.children?.length ? collect(error.children, path) : [path];
    });
  return collect(errors, '');
}

describe('CreateAreaDto', () => {
  it('accepts a road without details', async () => {
    expect(
      await invalidFields(CreateAreaDto, { applicationId: 'APP-1', ...road }),
    ).toEqual([]);
  });

  it('accepts a complete area with null for unused fields', async () => {
    expect(
      await invalidFields(CreateAreaDto, {
        applicationId: 'APP-1',
        ...road,
        houseNumberFrom: null,
        houseNumberTo: null,
        alternativeDescription: 'Ud for havnen',
        roadSection: 'Pavement',
        roadSide: 'Right',
        direction: null,
        lengthInMeters: 18,
        widthInMeters: 0.6,
        depthInMeters: null,
      }),
    ).toEqual([]);
  });

  it('requires the application and the road', async () => {
    expect((await invalidFields(CreateAreaDto, {})).sort()).toEqual([
      'applicationId',
      'postalCode',
      'roadName',
      'roadOwnership',
    ]);
  });

  it.each([['500'], ['50000'], ['ABCD'], [' 5000']])(
    'rejects the postal code %j',
    async (postalCode) => {
      expect(
        await invalidFields(CreateAreaDto, {
          applicationId: 'APP-1',
          ...road,
          postalCode,
        }),
      ).toEqual(['postalCode']);
    },
  );

  it('rejects unknown enum values', async () => {
    expect(
      await invalidFields(CreateAreaDto, {
        applicationId: 'APP-1',
        ...road,
        roadOwnership: 'State',
        roadSection: 'Highway',
        roadSide: 'Top',
        direction: 'Diagonal',
      }),
    ).toEqual(['roadOwnership', 'roadSection', 'roadSide', 'direction']);
  });

  it('rejects sizes that are zero, negative or not numbers', async () => {
    expect(
      await invalidFields(CreateAreaDto, {
        applicationId: 'APP-1',
        ...road,
        lengthInMeters: 0,
        widthInMeters: -1,
        depthInMeters: '1,2',
      }),
    ).toEqual(['lengthInMeters', 'widthInMeters', 'depthInMeters']);
  });

  it('rejects text that is too long', async () => {
    expect(
      await invalidFields(CreateAreaDto, {
        applicationId: 'APP-1',
        ...road,
        roadName: 'x'.repeat(201),
        houseNumberFrom: 'x'.repeat(21),
        alternativeDescription: 'x'.repeat(501),
      }),
    ).toEqual(['roadName', 'houseNumberFrom', 'alternativeDescription']);
  });

  it('rejects fields that are not part of an area', async () => {
    expect(
      await invalidFields(CreateAreaDto, {
        applicationId: 'APP-1',
        ...road,
        areaInSquareMeters: 10,
      }),
    ).toEqual(['areaInSquareMeters']);
  });
});

describe('CreateAreasDto', () => {
  it('accepts one or more roads', async () => {
    expect(
      await invalidFields(CreateAreasDto, {
        applicationId: 'APP-1',
        areas: [road, { ...road, roadName: 'Kirkestræde' }],
      }),
    ).toEqual([]);
  });

  it('requires at least one road', async () => {
    expect(
      await invalidFields(CreateAreasDto, {
        applicationId: 'APP-1',
        areas: [],
      }),
    ).toEqual(['areas']);
  });

  it('validates each road', async () => {
    expect(
      await invalidFields(CreateAreasDto, {
        applicationId: 'APP-1',
        areas: [road, { ...road, postalCode: '12' }],
      }),
    ).toEqual(['areas.1.postalCode']);
  });
});

describe('UpdateAreaDto', () => {
  it('makes every field optional', async () => {
    expect(await invalidFields(UpdateAreaDto, {})).toEqual([]);
    expect(await invalidFields(UpdateAreaDto, { lengthInMeters: 5 })).toEqual(
      [],
    );
  });

  it('still validates the fields that are sent', async () => {
    expect(
      await invalidFields(UpdateAreaDto, {
        postalCode: '12',
        widthInMeters: 0,
      }),
    ).toEqual(['postalCode', 'widthInMeters']);
  });

  it('cannot move an area to another application', async () => {
    expect(
      await invalidFields(UpdateAreaDto, { applicationId: 'APP-2' }),
    ).toEqual(['applicationId']);
  });
});
