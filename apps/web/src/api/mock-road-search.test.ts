import { describe, expect, test } from 'bun:test';
import { mockRoadSearch, mockRoads, searchRoads } from './mock-road-search.js';

describe('mock road search', () => {
  test('matches part of a street name, ignoring case', () => {
    const names = searchRoads(mockRoads, 'HAVN').map((road) => road.roadName);
    expect(names).toEqual(['Havnegade', 'Havnepladsen', 'Havnegade']);
  });

  test('matches postal code and city', () => {
    expect(searchRoads(mockRoads, '5800').length).toBe(5);
    expect(
      searchRoads(mockRoads, 'svend').every(
        (road) => road.city === 'Svendborg',
      ),
    ).toBe(true);
  });

  test('returns nothing for an unknown road or an empty query', async () => {
    expect(await mockRoadSearch.search('Ukendtvej')).toEqual([]);
    expect(await mockRoadSearch.search('   ')).toEqual([]);
  });

  test('mixes municipal and private common roads', () => {
    const ownerships = new Set(mockRoads.map((road) => road.roadOwnership));
    expect(ownerships).toEqual(new Set(['Municipality', 'Private']));
  });
});
