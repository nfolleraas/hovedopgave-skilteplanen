import {
  ApplicationType,
  RoadSection,
  RoadSide,
  Status,
} from '../../../generated/prisma/enums.js';
import {
  type AreaRuleInput,
  calculateAreaInSquareMeters,
  canEditAreas,
  findInvalidAreaFields,
  getAreaFieldSet,
} from './area-rules.js';

const completeExcavationArea: AreaRuleInput = {
  houseNumberFrom: '10',
  houseNumberTo: '24',
  roadSection: RoadSection.Pavement,
  roadSide: RoadSide.Right,
  direction: 'Along',
  lengthInMeters: 18,
  widthInMeters: 0.6,
  depthInMeters: 1.2,
};

describe('area rules', () => {
  describe('house numbers or alternative description (UC-034 F1)', () => {
    it('accepts both house numbers without a description', () => {
      expect(
        findInvalidAreaFields(
          ApplicationType.ExcavationPermit,
          completeExcavationArea,
        ),
      ).toEqual([]);
    });

    it('accepts a description without house numbers', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          houseNumberFrom: null,
          houseNumberTo: null,
          alternativeDescription: 'Ud for havnen',
        }),
      ).toEqual([]);
    });

    it('requires one of them', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          houseNumberFrom: ' ',
          houseNumberTo: undefined,
        }),
      ).toEqual(['houseNumberFrom', 'houseNumberTo', 'alternativeDescription']);
    });

    it('requires both house numbers when no description is given', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          houseNumberTo: null,
        }),
      ).toEqual(['houseNumberTo']);
    });
  });

  describe('fields per application type', () => {
    it('requires direction and depth for excavation permits', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          direction: null,
          depthInMeters: null,
        }),
      ).toEqual(['direction', 'depthInMeters']);
    });

    it('does not require direction and depth for containers (UC-034 A1)', () => {
      expect(getAreaFieldSet(ApplicationType.RoadUsePermit)).toEqual({
        direction: false,
        depth: false,
      });
      expect(
        findInvalidAreaFields(ApplicationType.RoadUsePermit, {
          ...completeExcavationArea,
          direction: null,
          depthInMeters: null,
        }),
      ).toEqual([]);
    });

    it('requires road element, road side, length and width', () => {
      expect(
        findInvalidAreaFields(ApplicationType.RoadUsePermit, {
          alternativeDescription: 'Ud for havnen',
        }),
      ).toEqual(['roadSection', 'roadSide', 'lengthInMeters', 'widthInMeters']);
    });

    it('rejects sizes that are zero or negative', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          lengthInMeters: 0,
          widthInMeters: -1,
          depthInMeters: 0,
        }),
      ).toEqual(['lengthInMeters', 'widthInMeters', 'depthInMeters']);
    });

    it('requires a description when the road element is Other', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          roadSection: RoadSection.Other,
        }),
      ).toEqual(['roadSectionDescription']);
    });
  });

  describe('edge cases', () => {
    it('treats a blank description as missing', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          houseNumberFrom: null,
          houseNumberTo: null,
          alternativeDescription: '   ',
        }),
      ).toEqual(['houseNumberFrom', 'houseNumberTo', 'alternativeDescription']);
    });

    it('accepts Other with a description', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          roadSection: RoadSection.Other,
          roadSectionDescription: 'Parkeringsplads',
        }),
      ).toEqual([]);
    });

    it('rejects sizes that are not finite numbers', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {
          ...completeExcavationArea,
          lengthInMeters: Number.NaN,
          widthInMeters: Number.POSITIVE_INFINITY,
        }),
      ).toEqual(['lengthInMeters', 'widthInMeters']);
    });

    it('treats unsupported application types like road use permits', () => {
      expect(getAreaFieldSet(ApplicationType.RoadUsePermitEvent)).toEqual({
        direction: false,
        depth: false,
      });
    });

    it('lists every field of an empty excavation area', () => {
      expect(
        findInvalidAreaFields(ApplicationType.ExcavationPermit, {}),
      ).toEqual([
        'houseNumberFrom',
        'houseNumberTo',
        'alternativeDescription',
        'roadSection',
        'roadSide',
        'direction',
        'lengthInMeters',
        'widthInMeters',
        'depthInMeters',
      ]);
    });
  });

  it('calculates the area as length times width', () => {
    expect(calculateAreaInSquareMeters(18, 0.6)).toBeCloseTo(10.8);
  });

  it('only allows changes for drafts and applications requiring changes', () => {
    expect(canEditAreas(Status.Draft)).toBe(true);
    expect(canEditAreas(Status.ChangeRequired)).toBe(true);
    expect(canEditAreas(Status.InProgress)).toBe(false);
    expect(canEditAreas(Status.Approved)).toBe(false);
    expect(canEditAreas(Status.Rejected)).toBe(false);
  });
});
