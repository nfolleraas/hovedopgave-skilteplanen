import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddressesService } from './addresses.service.js';

describe('AddressesService', () => {
  const service = new AddressesService();
  const fetchMock = vi.fn();
  const originalToken = process.env.DATAFORSYNINGEN_TOKEN;

  beforeEach(() => {
    process.env.DATAFORSYNINGEN_TOKEN = 'test-token';
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalToken === undefined) {
      delete process.env.DATAFORSYNINGEN_TOKEN;
    } else {
      process.env.DATAFORSYNINGEN_TOKEN = originalToken;
    }
  });

  it('returns road suggestions and selectable address matches', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          fund: [
            {
              id: 'address-id',
              titel: 'Vestergade 1, 8000 Aarhus C',
              type: 'adresse',
              husnummerId: 'house-number-id',
            },
            {
              id: 'road-id',
              titel: 'Vestergade, 8000 Aarhus C',
              type: 'navngivenvejpostnummer',
            },
            {
              id: 'house-number-id',
              titel: 'Vestergade 1, 8000 Aarhus C',
              type: 'husnummer',
              husnummer: '1',
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(service.searchAddresses('Vestergade 1')).resolves.toEqual([
      {
        id: 'address-id',
        titel: 'Vestergade 1, 8000 Aarhus C',
        type: 'adresse',
        husnummerId: 'house-number-id',
      },
      {
        id: 'road-id',
        titel: 'Vestergade, 8000 Aarhus C',
        type: 'navngivenvejpostnummer',
      },
      {
        id: 'house-number-id',
        titel: 'Vestergade 1, 8000 Aarhus C',
        type: 'husnummer',
        husnummerId: 'house-number-id',
      },
    ]);

    const [requestUrl] = fetchMock.mock.calls[0] as [URL];
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      'https://adressevaelger.dk/adresser/soeg',
    );
    expect(requestUrl.searchParams.get('tekst')).toBe('Vestergade 1');
    expect(requestUrl.searchParams.get('token')).toBe('test-token');
    expect(requestUrl.searchParams.get('maksimum')).toBe('10');
  });

  it('ignores malformed provider matches', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', fund: [null] }), {
        status: 200,
      }),
    );

    await expect(service.searchAddresses('Vestergade 1')).resolves.toEqual([]);
  });

  it('rejects invalid search text before calling the provider', async () => {
    await expect(service.searchAddresses('  a  ')).rejects.toThrow(
      'Invalid address search text',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects when the service token is missing', async () => {
    delete process.env.DATAFORSYNINGEN_TOKEN;

    await expect(service.searchAddresses('Vestergade 1')).rejects.toThrow(
      'Address service is not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the provider responds with a non-OK status', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(service.searchAddresses('Vestergade 1')).rejects.toThrow(
      'Address lookup failed',
    );
  });

  it('throws when the provider response shape is invalid', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 'nope' }), { status: 200 }),
    );

    await expect(service.searchAddresses('Vestergade 1')).rejects.toThrow(
      'Address lookup failed',
    );
  });
});
