import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { env } from '../config/env.js';
import { roadSearchService } from './road-search.api.js';

const originalFetch = globalThis.fetch;
const originalToken = env.dataforsyningenToken;
let fetchMock: ReturnType<typeof mock>;

beforeEach(() => {
  env.dataforsyningenToken = 'test-token';
  fetchMock = mock(async () => Response.json([]));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  env.dataforsyningenToken = originalToken;
});

describe('roadSearchService', () => {
  test('searches named roads at Dataforsyningen with the token', async () => {
    await roadSearchService.search('Strandvej 2900');

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(
      'https://api.dataforsyningen.dk/rest/gsearch/v2.0/navngivenvej',
    );
    expect(url.searchParams.get('q')).toBe('Strandvej 2900');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('token')).toBe('test-token');
  });

  test('returns one result per road and postal code', async () => {
    fetchMock.mockResolvedValue(
      Response.json([
        {
          id: 'road-1',
          vejnavn: 'Strandvej',
          postnummer: '2900',
          postnummernavn: 'Hellerup',
        },
        {
          id: 'road-2',
          vejnavn: 'Odensevej',
          postnummer: '5230,5260',
          postnummernavn: 'Odense M,Odense S',
        },
      ]),
    );

    const results = await roadSearchService.search('vej');

    expect(results.map((road) => road.id)).toEqual([
      'road-1',
      'road-2-5230',
      'road-2-5260',
    ]);
  });

  test('fails without a token and does not call the service', async () => {
    env.dataforsyningenToken = undefined;

    await expect(roadSearchService.search('Strandvej')).rejects.toThrow(
      'VITE_DATAFORSYNINGEN_TOKEN',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fails when Dataforsyningen answers with an error', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));

    await expect(roadSearchService.search('Strandvej')).rejects.toThrow(
      'status 503',
    );
  });
});
