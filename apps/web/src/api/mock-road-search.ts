import type { RoadSearchResult } from '../types/area.types.js';
import { RoadOwnership } from '../types/prisma-enums.js';
import type { RoadSearchService } from './road-search.api.js';

const { Municipality, Private } = RoadOwnership;

// Dummy roads until a real address API is connected (requirement F3).
export const mockRoads: readonly RoadSearchResult[] = [
  road('odense-1', 'Strandvej', '5000', 'Odense C', Municipality),
  road('odense-2', 'Havnegade', '5000', 'Odense C', Municipality),
  road('odense-3', 'Kirkestræde', '5000', 'Odense C', Private),
  road('odense-4', 'Cikorievej', '5220', 'Odense SØ', Municipality),
  road('odense-5', 'Cancellivej', '5200', 'Odense V', Municipality),
  road('odense-6', 'Rosenhaven', '5200', 'Odense V', Private),
  road('odense-7', 'Vesterbro', '5000', 'Odense C', Municipality),
  road('odense-8', 'Kildemosevej', '5240', 'Odense NØ', Private),
  road('svendborg-1', 'Strandvejen', '5700', 'Svendborg', Municipality),
  road('svendborg-2', 'Havnepladsen', '5700', 'Svendborg', Municipality),
  road('svendborg-3', 'Møllergade', '5700', 'Svendborg', Municipality),
  road('svendborg-4', 'Engstien', '5700', 'Svendborg', Private),
  road('svendborg-5', 'Bøgevej', '5700', 'Svendborg', Private),
  road('nyborg-1', 'Kongegade', '5800', 'Nyborg', Municipality),
  road('nyborg-2', 'Havnegade', '5800', 'Nyborg', Municipality),
  road('nyborg-3', 'Skovparken', '5800', 'Nyborg', Private),
  road('nyborg-4', 'Strandalléen', '5800', 'Nyborg', Municipality),
  road('nyborg-5', 'Lindevænget', '5800', 'Nyborg', Private),
];

function road(
  id: string,
  roadName: string,
  postalCode: string,
  city: string,
  roadOwnership: RoadOwnership,
): RoadSearchResult {
  return { id, roadName, postalCode, city, roadOwnership };
}

/** Case-insensitive partial match on street name, postal code or city. */
export function searchRoads(
  roads: readonly RoadSearchResult[],
  query: string,
): RoadSearchResult[] {
  const normalized = query.trim().toLocaleLowerCase('da-DK');
  if (!normalized) {
    return [];
  }

  return roads.filter((candidate) =>
    [candidate.roadName, candidate.postalCode, candidate.city].some((value) =>
      value.toLocaleLowerCase('da-DK').includes(normalized),
    ),
  );
}

export const mockRoadSearch: RoadSearchService = {
  async search(query) {
    return searchRoads(mockRoads, query);
  },
};
