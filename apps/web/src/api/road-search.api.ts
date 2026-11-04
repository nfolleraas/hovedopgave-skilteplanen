import type { RoadSearchResult } from '../types/area.types.js';
import { mockRoadSearch } from './mock-road-search.js';

/**
 * Searches roads by street name, postal code or city. A real address API
 * can replace the mock by implementing this interface.
 */
export interface RoadSearchService {
  search(query: string, signal?: AbortSignal): Promise<RoadSearchResult[]>;
}

export const roadSearchService: RoadSearchService = mockRoadSearch;
