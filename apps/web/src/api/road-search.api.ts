import { env } from '../config/env.js';
import type { RoadSearchResult } from '../types/area.types.js';
import { type NamedRoad, toRoadSearchResults } from './mappers/road.mapper.js';

const gsearchUrl =
  'https://api.dataforsyningen.dk/rest/gsearch/v2.0/navngivenvej';

// Dataforsyningen allows at most 100 results per request.
const searchLimit = 20;

/** Searches roads by street name and optionally postal code. */
export interface RoadSearchService {
  search(query: string): Promise<RoadSearchResult[]>;
}

/** Calls Dataforsyningen's GSearch directly from the browser (F3). */
export const roadSearchService: RoadSearchService = {
  async search(query) {
    const token = env.dataforsyningenToken;
    if (!token) {
      throw new Error(
        'VITE_DATAFORSYNINGEN_TOKEN must be set to search roads.',
      );
    }

    const params = new URLSearchParams({
      q: query,
      limit: String(searchLimit),
      token,
    });
    const response = await fetch(`${gsearchUrl}?${params}`);
    if (!response.ok) {
      throw new Error(
        `Dataforsyningen road search failed with status ${response.status}.`,
      );
    }

    const roads = (await response.json()) as NamedRoad[];
    return roads.flatMap(toRoadSearchResults);
  },
};
