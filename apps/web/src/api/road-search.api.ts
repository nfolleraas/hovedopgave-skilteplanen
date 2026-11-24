import { env } from '../config/env.js';
import type { RoadSearchResult } from '../types/area.types.js';
import { type NamedRoad, toRoadSearchResults } from './mappers/road.mapper.js';

const gsearchUrl =
  'https://api.dataforsyningen.dk/rest/gsearch/v2.0/navngivenvej';

// Dataforsyningen allows at most 100 results per request.
const searchLimit = 20;

/**
 * Longest search text. Danish road names are far shorter, and Dataforsyningen
 * answers HTTP 400 when the URL becomes too long.
 */
export const roadSearchMaxLength = 100;

/**
 * Keeps letters, digits, spaces and points (as in `H.C. Andersens Boulevard`).
 * Other characters, such as `&`, `|`, `:`, `!` and quotes, can be read as
 * search operators by GSearch and make it answer HTTP 400, so they become
 * spaces. Accents and æ, ø, å are letters and are kept.
 */
export function toRoadSearchText(query: string): string {
  return query
    .slice(0, roadSearchMaxLength)
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
        'VITE_DATAFORSYNINGEN_PUBLISHABLE_TOKEN must be set to search roads.',
      );
    }

    // Only special characters, such as "&": no road can match.
    const searchText = toRoadSearchText(query);
    if (!searchText) return [];

    const params = new URLSearchParams({
      q: searchText,
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
