import type {
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
} from '../../../generated/prisma/enums.js';
import type {
  AreaDetailModel,
  AreaModel,
  AreaSizeModel,
} from '../../../generated/prisma/models.js';

export type AreaWithRelations = AreaModel & {
  areaDetail: AreaDetailModel | null;
  areaSize: AreaSizeModel | null;
};

/** Flat area shape returned by the API. */
export interface AreaResponse {
  uuid: string;
  applicationId: string;
  roadName: string;
  roadOwnership: RoadOwnership;
  postalCode: string;
  houseNumberFrom: string | null;
  houseNumberTo: string | null;
  alternativeDescription: string | null;
  roadSection: RoadSection | null;
  roadSectionDescription: string | null;
  roadSide: RoadSide | null;
  direction: Direction | null;
  lengthInMeters: number | null;
  widthInMeters: number | null;
  depthInMeters: number | null;
  areaInSquareMeters: number | null;
}

export function toAreaResponse(area: AreaWithRelations): AreaResponse {
  return {
    uuid: area.uuid,
    applicationId: area.applicationId,
    roadName: area.roadName,
    roadOwnership: area.roadOwnership,
    postalCode: area.postalCode,
    houseNumberFrom: area.houseNumberFrom,
    houseNumberTo: area.houseNumberTo,
    alternativeDescription: area.alternativeDescription,
    roadSection: area.areaDetail?.roadSection ?? null,
    roadSectionDescription: area.areaDetail?.roadSectionDescription ?? null,
    roadSide: area.areaDetail?.roadSide ?? null,
    direction: area.areaDetail?.direction ?? null,
    lengthInMeters: area.areaSize?.lengthInMeters ?? null,
    widthInMeters: area.areaSize?.widthInMeters ?? null,
    depthInMeters: area.areaSize?.depthInMeters ?? null,
    areaInSquareMeters: area.areaSize?.areaInSquareMeters ?? null,
  };
}
