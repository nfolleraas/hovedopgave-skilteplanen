import { afterEach, describe, expect, it } from 'vitest';
import { searchAddresses } from './addresses.api.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('searchAddresses', () => {
  it('calls the search endpoint with the given text', async () => {
    globalThis.fetch = (async (input, _init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe('https://adressevaelger.dk');
      expect(url.pathname).toBe('/husnumre/soeg');
      expect(url.searchParams.get('tekst')).toBe('Vestergade');
      expect(url.searchParams.get('maksimum')).toBe('5');
      return Response.json({
        status: 'ok',
        fund: [
          { id: '1', titel: 'Vestergade 1, 8000 Aarhus C', type: 'husnummer' },
          { id: '1', titel: 'Vestergade 1, 8000 Aarhus C', type: 'husnummer' },
          { titel: 'Vestergade', type: 'navngivenvejpostnummer' },
          { titel: 'Manglende id', type: 'husnummer' },
        ],
      });
    }) as typeof fetch;

    await expect(
      searchAddresses('Vestergade', new AbortController().signal),
    ).resolves.toEqual([
      { id: '1', titel: 'Vestergade 1, 8000 Aarhus C', type: 'husnummer' },
      { id: 'Vestergade', titel: 'Vestergade', type: 'navngivenvejpostnummer' },
    ]);
  });

  it('throws when the API responds with an error', async () => {
    globalThis.fetch = (async (_input, _init) => {
      return new Response('nope', { status: 500 });
    }) as typeof fetch;

    await expect(
      searchAddresses('Vestergade', new AbortController().signal),
    ).rejects.toThrow('Address request failed');
  });
});
