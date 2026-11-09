import { describe, expect, test } from 'bun:test';
import { toRoadSearchResults } from './road.mapper.js';

describe('toRoadSearchResults', () => {
  test('maps a Dataforsyningen road to a search result', () => {
    expect(
      toRoadSearchResults({
        id: 'road-1',
        vejnavn: 'Strandvej',
        postnummer: '2900',
        postnummernavn: 'Hellerup',
      }),
    ).toEqual([
      {
        id: 'road-1',
        roadName: 'Strandvej',
        postalCode: '2900',
        city: 'Hellerup',
      },
    ]);
  });

  test('splits a road that crosses postal codes into one result each', () => {
    const results = toRoadSearchResults({
      id: 'road-2',
      vejnavn: 'Odensevej',
      postnummer: '5230,5260',
      postnummernavn: 'Odense M,Odense S',
    });

    expect(
      results.map((road) => [road.id, road.postalCode, road.city]),
    ).toEqual([
      ['road-2-5230', '5230', 'Odense M'],
      ['road-2-5260', '5260', 'Odense S'],
    ]);
  });
});
