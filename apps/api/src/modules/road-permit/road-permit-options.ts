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

export const materialTypes: Readonly<Record<string, MaterialType>> =
  MaterialType;

export const roadPermitTrafficChanges = Object.values(TrafficChange).filter(
  (change) => change !== TrafficChange.TrafficLight,
);

// Accept values sent by older clients and stored in existing drafts.
export const trafficChanges: Readonly<Record<string, TrafficChange>> = {
  ...Object.fromEntries(
    roadPermitTrafficChanges.map((change) => [change, change]),
  ),
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
