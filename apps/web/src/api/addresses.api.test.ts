import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  lookupAddress,
  parseAddressLookup,
  parseAddressSuggestions,
  searchAddresses,
} from './addresses.api.js';

describe('Adressevælger response mapping', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_DATAFORSYNINGEN_TOKEN', 'address-test-fixture');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects missing configuration before sending an address request', async () => {
    vi.stubEnv('VITE_DATAFORSYNINGEN_TOKEN', '');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(searchAddresses('Testvej')).rejects.toThrow(
      'Address search is not configured.',
    );
    await expect(lookupAddress('address-id')).rejects.toThrow(
      'Address search is not configured.',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('searches Adressevælger directly with the configured public token', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    try {
      globalThis.fetch = async (input, options) => {
        const url = new URL(String(input));
        expect(url.origin).toBe('https://adressevaelger.dk');
        expect(url.pathname).toBe('/husnumre/soeg');
        expect(url.searchParams.get('tekst')).toBe('Testvej 1');
        expect(url.searchParams.get('token')).toBe('address-test-fixture');
        expect(options?.signal).toBeTruthy();
        expect(options?.signal?.aborted).toBe(false);
        return Response.json({ status: 'ok', fund: [] });
      };
      expect(
        await searchAddresses('Testvej 1', controller.signal),
      ).toStrictEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects a failed address lookup instead of accepting an unverified address', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input) => {
        const url = new URL(String(input));
        expect(url.origin).toBe('https://adressevaelger.dk');
        expect(url.pathname).toBe('/husnumre/address-id');
        expect(url.searchParams.get('token')).toBe('address-test-fixture');
        return new Response(null, { status: 503 });
      };
      await expect(lookupAddress('address-id')).rejects.toThrow(
        /Address lookup failed/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  it('offers street suggestions for refining a search alongside complete addresses', () => {
    expect(
      parseAddressSuggestions({
        status: 'ok',
        fund: [
          { type: 'vejnavn', id: 'road', titel: 'Sankt Kjelds Plads' },
          {
            type: 'husnummer',
            id: 'address-id',
            titel: 'Sankt Kjelds Plads 11, 2100 København Ø',
          },
        ],
      }),
    ).toStrictEqual([
      {
        id: 'vejnavn:Sankt Kjelds Plads',
        title: 'Sankt Kjelds Plads',
        searchText: 'Sankt Kjelds Plads',
      },
      {
        id: 'address-id',
        title: 'Sankt Kjelds Plads 11, 2100 København Ø',
      },
    ]);
  });

  it('offers partial matches without address ids as search refinements', () => {
    const partialTypes = [
      'vejnavn',
      'navngivenvejpostnummer',
      'navngivenvejpostnummerdel',
      'vejnavnhusnummer',
    ];
    for (const type of partialTypes) {
      expect(
        parseAddressSuggestions({
          status: 'ok',
          fund: [{ type, titel: 'Testvej 5000 Odense' }],
        }),
      ).toStrictEqual([
        {
          id: `${type}:Testvej 5000 Odense`,
          title: 'Testvej 5000 Odense',
          searchText: 'Testvej 5000 Odense',
        },
      ]);
    }
  });

  it('ignores unsupported hits', () => {
    expect(
      parseAddressSuggestions({
        status: 'ok',
        fund: [null, {}, { type: 'unknown', titel: 'Unknown' }],
      }),
    ).toStrictEqual([]);
  });

  it('rejects supported suggestions with missing or blank IDs and titles', () => {
    for (const item of [
      { type: 'husnummer', titel: 'Testvej 1' },
      { type: 'husnummer', id: '   ', titel: 'Testvej 1' },
      { type: 'husnummer', id: 'address-id', titel: '   ' },
      { type: 'vejnavn', titel: '' },
    ]) {
      expect(() =>
        parseAddressSuggestions({ status: 'ok', fund: [item] }),
      ).toThrow(/Invalid address suggestion/);
    }
    expect(
      parseAddressSuggestions({
        status: 'ok',
        fund: [{ type: 'husnummer', id: ' address-id ', titel: ' Testvej 1 ' }],
      }),
    ).toStrictEqual([{ id: 'address-id', title: 'Testvej 1' }]);
  });

  it('rejects incomplete address fields and normalizes valid surrounding whitespace', () => {
    const houseNumber = {
      status: '3',
      vejnavn: ' Testvej ',
      husnummertekst: ' 1 ',
      postnummer: { postnr: ' 5000 ', navn: ' Odense ' },
    };
    for (const overrides of [
      { vejnavn: '' },
      { vejnavn: '   ' },
      { husnummertekst: '\t' },
      { postnummer: { postnr: '5000', navn: '   ' } },
      { postnummer: { postnr: 'abc', navn: 'Odense' } },
      { postnummer: { postnr: '50000', navn: 'Odense' } },
      { postnummer: { postnr: 5000, navn: 'Odense' } },
    ]) {
      expect(() =>
        parseAddressLookup({
          status: 'ok',
          husnummer: { ...houseNumber, ...overrides },
        }),
      ).toThrow(/incomplete/);
    }
    expect(
      parseAddressLookup({ status: 'ok', husnummer: houseNumber }),
    ).toStrictEqual({
      street: 'Testvej',
      houseNumber: '1',
      postalCode: '5000',
      city: 'Odense',
    });
  });

  it('times out stalled searches and lookups after the configured deadline', async () => {
    const originalFetch = globalThis.fetch;
    const originalTimeout = AbortSignal.timeout;
    try {
      for (const request of [
        () => searchAddresses('Testvej'),
        () => lookupAddress('address-id'),
      ]) {
        const deadline = new AbortController();
        AbortSignal.timeout = (milliseconds) => {
          expect(milliseconds).toBe(10_000);
          return deadline.signal;
        };
        globalThis.fetch = (_input, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true },
            );
          });
        const pending = request();
        deadline.abort(new DOMException('Request timed out', 'TimeoutError'));
        await expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
      }
    } finally {
      globalThis.fetch = originalFetch;
      AbortSignal.timeout = originalTimeout;
    }
  });

  it('preserves caller cancellation for searches and lookups', async () => {
    const originalFetch = globalThis.fetch;
    try {
      for (const request of [searchAddresses, lookupAddress]) {
        const controller = new AbortController();
        globalThis.fetch = (_input, options) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true },
            );
          });
        const pending = request('address', controller.signal);
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps the authoritative address fields from an id lookup', () => {
    expect(
      parseAddressLookup({
        status: 'ok',
        husnummer: {
          status: '3',
          vejnavn: 'Sankt Kjelds Plads',
          husnummertekst: '11',
          postnummer: { postnr: '2100', navn: 'København Ø' },
        },
      }),
    ).toStrictEqual({
      street: 'Sankt Kjelds Plads',
      houseNumber: '11',
      postalCode: '2100',
      city: 'København Ø',
    });
  });

  it('rejects inactive or incomplete lookup results', () => {
    expect(() =>
      parseAddressLookup({
        status: 'ok',
        husnummer: { status: '5', vejnavn: 'Old Road' },
      }),
    ).toThrow();
  });
});
