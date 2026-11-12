import type Feature from 'ol/Feature.js';
import { getRoadCodes } from './roadData';

type RoadNameResponse = {
  features?: {
    properties?: { CPR_VEJKODE?: number; CPR_VEJNAVN?: string };
  }[];
};

export async function findRoadName(road: Feature, signal: AbortSignal) {
  const codes = getRoadCodes(road);
  if (!codes) return '';

  // Vejdirektoratet's CPR road key combines the municipality and road codes.
  const cprCode = Number(codes.municipality + codes.road);
  const url = new URL('https://geocloud.vd.dk/vejman-stamdata/wfs');
  url.search = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'vejman-stamdata:cpr-vejnavn',
    CQL_FILTER: `CPR_VEJKODE=${cprCode}`,
    propertyName: 'CPR_VEJKODE,CPR_VEJNAVN',
    outputFormat: 'application/json',
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
  });
  if (!response.ok) throw new Error('Road name lookup failed');

  const { features } = (await response.json()) as RoadNameResponse;
  const names = new Set<string>();
  for (const feature of features ?? []) {
    const name = feature.properties?.CPR_VEJNAVN?.trim();
    if (name && feature.properties?.CPR_VEJKODE === cprCode) names.add(name);
  }

  return names.size === 1 ? [...names][0] : '';
}
