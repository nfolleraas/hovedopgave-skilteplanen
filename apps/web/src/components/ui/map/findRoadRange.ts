import { type Coordinate, squaredDistance } from 'ol/coordinate.js';
import { buffer } from 'ol/extent.js';
import type Feature from 'ol/Feature.js';
import type LineString from 'ol/geom/LineString.js';
import { transform, transformExtent } from 'ol/proj.js';
import { getAddressData } from '../../../utils/adressevaelger';
import { compareHouseNumbers } from '../../../utils/validateHouseNumberRange';
import type { RoadLocation } from '../../../utils/validateRoadLocation';
import { findRoadName } from './findRoadName';
import { getRoadCodes } from './roadData';

type Address = {
  geometry?: { coordinates: Coordinate };
  properties?: {
    inspireid?: string;
    component_thoroughfarename?: string;
    component_adminunitname_3?: string;
    status?: string;
  };
};

type AddressDetails = {
  husnummer?: {
    vejnavn?: string;
    husnummertekst?: string;
    postnummer?: { postnr?: string; navn?: string };
    navngivenvejkommunedel?: { kommune?: string; vejkode?: string };
  };
};

/** Finds the nearest active address per street and municipality around a drawing endpoint. */
async function nearbyAddresses(
  [x, y]: Coordinate,
  projection: string,
  signal: AbortSignal,
) {
  const radius = 130;
  const extent = transformExtent(
    buffer([x, y, x, y], radius),
    projection,
    'EPSG:4326',
  );
  const url = new URL(
    'https://api.dataforsyningen.dk/ogcapi/features/ad_inspire/collections/address/items',
  );
  url.search = new URLSearchParams({
    bbox: extent.join(','),
    limit: '100',
    f: 'json',
  }).toString();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Nearby address lookup failed');
  const { features } = (await response.json()) as { features: Address[] };
  const streets = new Map<string, { id: string; distance: number }>();

  for (const { geometry, properties } of features) {
    const id = properties?.inspireid;
    const street = properties?.component_thoroughfarename;
    if (!id || !street || !geometry || properties.status !== 'current')
      continue;

    const key = `${street}|${properties.component_adminunitname_3}`;
    const location = transform(geometry.coordinates, 'EPSG:4326', projection);
    const distance = squaredDistance([x, y], location);
    if (
      distance > radius ** 2 ||
      distance >= (streets.get(key)?.distance ?? Infinity)
    ) {
      continue;
    }
    streets.set(key, { id, distance });
  }
  return [...streets.values()]
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 6);
}

/** Builds an address suggestion for a snapped stretch and leaves conflicting postal districts blank. */
export async function findRoadRange(
  feature: Feature,
  line: LineString,
  projection: string,
  signal: AbortSignal,
): Promise<RoadLocation> {
  const codes = getRoadCodes(feature);
  const requests = new Map<string, Promise<AddressDetails>>();
  const lookupSignal = AbortSignal.any([signal, AbortSignal.timeout(5000)]);

  /** Returns the nearest candidate whose municipality and road code match the selected road. */
  async function matchEndpoint(point: Coordinate) {
    if (!codes) return;
    const candidates = await nearbyAddresses(point, projection, lookupSignal);
    const results = await Promise.all(
      candidates.map(async ({ id }) => {
        let request = requests.get(id);
        if (!request) {
          request = getAddressData<AddressDetails>(
            encodeURIComponent(id),
            new URLSearchParams(),
            lookupSignal,
          );
          requests.set(id, request);
        }
        const address = (await request.catch(() => undefined))?.husnummer;
        const road = address?.navngivenvejkommunedel;
        const number = address?.husnummertekst?.trim();
        const name = address?.vejnavn?.trim();
        if (
          name &&
          number &&
          road?.kommune === codes.municipality &&
          road.vejkode === codes.road
        ) {
          return { name, number, postalDistrict: address?.postnummer };
        }
      }),
    );
    return results.find(Boolean);
  }

  const [start, end, roadName] = await Promise.all([
    matchEndpoint(line.getFirstCoordinate()).catch(() => undefined),
    matchEndpoint(line.getLastCoordinate()).catch(() => undefined),
    findRoadName(feature, signal).catch(() => ''),
  ]);
  const numbers =
    start && end ? [start.number, end.number].sort(compareHouseNumbers) : [];
  const startDistrict = start?.postalDistrict;
  const endDistrict = end?.postalDistrict;
  const districtsDiffer =
    startDistrict?.postnr &&
    endDistrict?.postnr &&
    startDistrict.postnr !== endDistrict.postnr;
  const district = districtsDiffer ? undefined : (startDistrict ?? endDistrict);
  return {
    road: start?.name ?? end?.name ?? roadName,
    houseNumberFrom: numbers[0] ?? '',
    houseNumberTo: numbers[1] ?? '',
    postalCode: district?.postnr?.trim() ?? '',
    city: district?.navn?.trim() ?? '',
  };
}
