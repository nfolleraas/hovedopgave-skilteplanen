import { afterEach, describe, expect, it } from 'bun:test';
import { searchAddresses } from './addresses.api.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('searchAddresses', () => {
  it('calls the search endpoint with the given text', async () => {
    globalThis.fetch = (async (input, _init) => {
      expect(input).toBe('/api/addresses/search?text=Vestergade');
      return new Response(
        JSON.stringify([{ id: '1', titel: 'X', type: 'adresse' }]),
        {
          status: 200,
        },
      );
    }) as typeof fetch;

    await expect(searchAddresses('Vestergade')).resolves.toEqual([
      { id: '1', titel: 'X', type: 'adresse' },
    ]);
  });

  it('throws when the API responds with an error', async () => {
    globalThis.fetch = (async (_input, _init) => {
      return new Response('nope', { status: 500 });
    }) as typeof fetch;

    await expect(searchAddresses('Vestergade')).rejects.toThrow(
      'Address lookup failed (500)',
    );
  });
});
