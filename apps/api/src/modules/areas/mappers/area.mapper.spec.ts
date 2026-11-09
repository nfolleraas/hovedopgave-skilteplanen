import {
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
} from '../../../generated/prisma/enums.js';
import { type AreaWithRelations, toAreaResponse } from './area.mapper.js';

const road = {
  uuid: 'area-1',
  applicationId: 'APP-1',
  roadName: 'Strandvej',
  roadOwnership: RoadOwnership.Municipality,
  postalCode: '5000',
  houseNumberFrom: '10',
  houseNumberTo: '24',
  alternativeDescription: null,
};

describe('toAreaResponse', () => {
  it('flattens the detail and size records into one area', () => {
    const area: AreaWithRelations = {
      ...road,
      areaDetailId: 'detail-1',
      areaSizeId: 'size-1',
      areaDetail: {
        uuid: 'detail-1',
        roadSection: RoadSection.Other,
        roadSectionDescription: 'Parkeringsplads',
        roadSide: RoadSide.Left,
        direction: Direction.Across,
      },
      areaSize: {
        uuid: 'size-1',
        lengthInMeters: 18,
        widthInMeters: 0.6,
        depthInMeters: 1.2,
        areaInSquareMeters: 10.8,
      },
    };

    expect(toAreaResponse(area)).toEqual({
      ...road,
      roadSection: RoadSection.Other,
      roadSectionDescription: 'Parkeringsplads',
      roadSide: RoadSide.Left,
      direction: Direction.Across,
      lengthInMeters: 18,
      widthInMeters: 0.6,
      depthInMeters: 1.2,
      areaInSquareMeters: 10.8,
    });
  });

  it('returns null details for an area from the road search', () => {
    const area: AreaWithRelations = {
      ...road,
      areaDetailId: null,
      areaSizeId: null,
      areaDetail: null,
      areaSize: null,
    };

    expect(toAreaResponse(area)).toEqual({
      ...road,
      roadSection: null,
      roadSectionDescription: null,
      roadSide: null,
      direction: null,
      lengthInMeters: null,
      widthInMeters: null,
      depthInMeters: null,
      areaInSquareMeters: null,
    });
  });

  it('does not expose the internal detail and size ids', () => {
    const response = toAreaResponse({
      ...road,
      areaDetailId: 'detail-1',
      areaSizeId: 'size-1',
      areaDetail: null,
      areaSize: null,
    });

    expect(response).not.toHaveProperty('areaDetailId');
    expect(response).not.toHaveProperty('areaSizeId');
  });
});
