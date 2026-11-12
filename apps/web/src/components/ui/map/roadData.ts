import { type Coordinate, squaredDistance } from 'ol/coordinate.js';
import type { Extent } from 'ol/extent.js';
import { buffer } from 'ol/extent.js';
import type Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';

export const roadReferenceLayerName = 'vrd:vrd_couplings';
export const roadDataAttribution =
  '&copy; <a href="https://www.vejdirektoratet.dk/" target="_blank" rel="noopener noreferrer">Vejdirektoratet</a>';

type RoadCodes = { municipality: string; road: string };

export function getRoadCodes(feature: Feature): RoadCodes | undefined {
  const municipality = feature.get('vejgeometrikommunekode');
  const road = feature.get('vejgeometrivejkode');
  if (
    typeof municipality === 'string' &&
    /^\d{4}$/.test(municipality) &&
    typeof road === 'string' &&
    /^\d{4}$/.test(road) &&
    road !== '0000'
  ) {
    return { municipality, road };
  }
}

const roadFormat = new GeoJSON();

export async function readRoads(
  extent: Extent,
  projection: string,
  signal: AbortSignal,
  codes?: RoadCodes,
) {
  const url = new URL('https://geocloud.vd.dk/vrd/wfs');
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: roadReferenceLayerName,
    srsName: projection,
    outputFormat: 'application/json',
    count: codes ? '500' : '50',
  });
  if (codes) {
    params.set(
      'CQL_FILTER',
      `BBOX(wkb_geometry_2d,${extent.join(',')},'${projection}') AND vejgeometrikommunekode='${codes.municipality}' AND vejgeometrivejkode='${codes.road}'`,
    );
  } else {
    params.set('bbox', [...extent, projection].join(','));
  }
  url.search = params.toString();

  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok) throw new Error('Road lookup failed');
  const data = await response.json();
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error('Invalid road geometry response');
  }

  return roadFormat
    .readFeatures(data, {
      dataProjection: projection,
      featureProjection: projection,
    })
    .filter((feature) => {
      const type = feature.getGeometry()?.getType();
      return type === 'LineString' || type === 'MultiLineString';
    });
}

export async function findNearestRoad(
  coordinate: Coordinate,
  radius: number,
  projection: string,
  signal: AbortSignal,
) {
  const [x, y] = coordinate;
  const roads = await readRoads(
    buffer([x, y, x, y], radius),
    projection,
    signal,
  );
  let nearestRoad: Feature | undefined;
  let nearestDistance = radius ** 2;
  for (const road of roads) {
    const geometry = road.getGeometry();
    if (!geometry) continue;

    const distance = squaredDistance(
      coordinate,
      geometry.getClosestPoint(coordinate),
    );
    if (distance < nearestDistance) {
      nearestRoad = road;
      nearestDistance = distance;
    }
  }
  return nearestRoad;
}
