import type { SupportedApplicationType } from '../../types/application.types.js';
import type { AreaFormField } from '../../types/area.types.js';
import type {
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
} from '../../types/prisma-enums.js';

// One place for enum labels. The Danish and English text lives in
// locales/*/translation.json under `areas.labels`.
export const roadOwnershipLabelKeys: Record<RoadOwnership, string> = {
  Municipality: 'areas.labels.roadOwnership.Municipality',
  Private: 'areas.labels.roadOwnership.Private',
};

export const roadSectionLabelKeys: Record<RoadSection, string> = {
  Lane: 'areas.labels.roadSection.Lane',
  EmergencyLane: 'areas.labels.roadSection.EmergencyLane',
  BikeLane: 'areas.labels.roadSection.BikeLane',
  Pavement: 'areas.labels.roadSection.Pavement',
  Roundabout: 'areas.labels.roadSection.Roundabout',
  RoadVerge: 'areas.labels.roadSection.RoadVerge',
  Other: 'areas.labels.roadSection.Other',
};

export const roadSideLabelKeys: Record<RoadSide, string> = {
  Left: 'areas.labels.roadSide.Left',
  Right: 'areas.labels.roadSide.Right',
  Both: 'areas.labels.roadSide.Both',
  Middle: 'areas.labels.roadSide.Middle',
};

export const directionLabelKeys: Record<Direction, string> = {
  Along: 'areas.labels.direction.Along',
  Across: 'areas.labels.direction.Across',
};

export const applicationTypeLabelKeys: Record<
  SupportedApplicationType,
  string
> = {
  ExcavationPermit: 'areas.labels.applicationType.ExcavationPermit',
  RoadUsePermit: 'areas.labels.applicationType.RoadUsePermit',
};

export const areaFieldLabelKeys: Record<AreaFormField, string> = {
  roadName: 'areas.fields.roadName',
  roadOwnership: 'areas.fields.roadOwnership',
  postalCode: 'areas.fields.postalCode',
  houseNumberFrom: 'areas.fields.houseNumberFrom',
  houseNumberTo: 'areas.fields.houseNumberTo',
  alternativeDescription: 'areas.fields.alternativeDescription',
  roadSection: 'areas.fields.roadSection',
  roadSectionDescription: 'areas.fields.roadSectionDescription',
  roadSide: 'areas.fields.roadSide',
  direction: 'areas.fields.direction',
  lengthInMeters: 'areas.fields.lengthInMeters',
  widthInMeters: 'areas.fields.widthInMeters',
  depthInMeters: 'areas.fields.depthInMeters',
};
