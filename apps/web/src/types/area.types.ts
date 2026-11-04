import type {
  ApplicationType,
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
  Status,
} from './prisma-enums.js';

/** Area as returned by the areas API. */
export interface Area {
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

export interface AreaApplication {
  caseNumber: string;
  type: ApplicationType;
  status: Status;
}

export interface ApplicationAreas {
  application: AreaApplication;
  areas: Area[];
}

/** Fields sent when creating or updating an area. */
export type AreaInput = Partial<
  Omit<Area, 'uuid' | 'applicationId' | 'areaInSquareMeters'>
>;

/** Form values are kept as text so the user's input is never reformatted. */
export interface AreaFormValues {
  roadName: string;
  roadOwnership: RoadOwnership | '';
  postalCode: string;
  houseNumberFrom: string;
  houseNumberTo: string;
  alternativeDescription: string;
  roadSection: RoadSection | '';
  roadSectionDescription: string;
  roadSide: RoadSide | '';
  direction: Direction | '';
  lengthInMeters: string;
  widthInMeters: string;
  depthInMeters: string;
}

export type AreaFormField = keyof AreaFormValues;

/** A road found by the road search. */
export interface RoadSearchResult {
  id: string;
  roadName: string;
  postalCode: string;
  city: string;
  roadOwnership: RoadOwnership;
}
