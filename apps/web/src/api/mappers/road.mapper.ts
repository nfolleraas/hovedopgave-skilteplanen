import type { RoadSearchResult } from '../../types/area.types.js';

/**
 * A named road from Dataforsyningen's GSearch `navngivenvej` resource. Only
 * the fields the app uses are listed. A road that crosses postal codes has
 * them comma-separated, such as `postnummer: '5230,5260'`.
 */
export interface NamedRoad {
  id: string;
  vejnavn: string;
  postnummer: string;
  postnummernavn: string;
}

/**
 * An area has exactly one postal code, so a road that crosses postal codes
 * becomes one result per postal code.
 */
export function toRoadSearchResults(road: NamedRoad): RoadSearchResult[] {
  const postalCodes = road.postnummer.split(',');
  const cities = road.postnummernavn.split(',');

  return postalCodes.map((postalCode, index) => ({
    id: postalCodes.length > 1 ? `${road.id}-${postalCode.trim()}` : road.id,
    roadName: road.vejnavn,
    postalCode: postalCode.trim(),
    city: (cities[index] ?? '').trim(),
  }));
}
