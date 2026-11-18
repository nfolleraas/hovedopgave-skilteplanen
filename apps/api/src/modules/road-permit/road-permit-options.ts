import {
  MaterialType,
  TrafficCalmingMeasureScope,
  TrafficChange,
  Usage,
} from '../../generated/prisma/enums.js';

export const usageTypes: Readonly<Record<string, Usage>> = {
  Byggearbejde: Usage.Construction,
  Arrangement: Usage.Other,
  Andet: Usage.Other,
};

export const materialTypes: Readonly<Record<string, MaterialType>> = {
  ...MaterialType,
  // Accept localized values stored by older clients.
  Stillads: MaterialType.Scaffolding,
  Andet: MaterialType.Other,
};

export const trafficChanges: Readonly<Record<string, TrafficChange>> = {
  'Hastighedsbegrænsning - hensyn til vejarbejder':
    TrafficChange.SpeedLimitWorkZone,
  'Hastighedsbegrænsning - hensyn til trafikanter':
    TrafficChange.SpeedLimitTrafficSafety,
  'Hastighedsbegrænsning - hensyn til trafikanter og vejarbejdere':
    TrafficChange.SpeedLimitWorkZoneAndTrafficSafety,
  'Ubetinget vigepligt i vejkryds':
    TrafficChange.UnconditionalObligationInIntersection,
  'Standsning og Parkering': TrafficChange.NoStoppingAndParking,
  'Påbud om ensrettet færdsel': TrafficChange.OnewayTraffic,
};

export const trafficScopes: Readonly<
  Record<string, TrafficCalmingMeasureScope>
> = {
  Begge: TrafficCalmingMeasureScope.Both,
  // TODO: Passing traffic has no exact enum; OncomingTraffic is a placeholder.
  'Forbipasserende trafik': TrafficCalmingMeasureScope.OncomingTraffic,
  'Bagfrakommende trafik': TrafficCalmingMeasureScope.FollowingTraffic,
};
