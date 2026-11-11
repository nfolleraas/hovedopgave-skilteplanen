import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  lookupAddress,
  parseAddressLookup,
  parseAddressSuggestions,
  searchAddresses,
} from './addresses.api.js';

describe('Adressevælger response mapping', () => {
  it('searches through the local proxy without exposing a token', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    try {
      globalThis.fetch = async (input, options) => {
        const url = new URL(String(input), 'http://localhost');
        assert.equal(url.pathname, '/address-lookup/husnumre/soeg');
        assert.equal(url.searchParams.get('tekst'), 'Testvej 1');
        assert.equal(url.searchParams.has('token'), false);
        assert.equal(options?.signal, controller.signal);
        return Response.json({ status: 'ok', fund: [] });
      };
      assert.deepEqual(
        await searchAddresses('Testvej 1', controller.signal),
        [],
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects a failed address lookup instead of accepting an unverified address', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input) => {
        assert.equal(input, '/address-lookup/husnumre/address-id');
        return new Response(null, { status: 503 });
      };
      await assert.rejects(
        lookupAddress('address-id'),
        /Address lookup failed/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  it('offers street suggestions for refining a search alongside complete addresses', () => {
    assert.deepEqual(
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
      [
        {
          id: 'vejnavn:Sankt Kjelds Plads',
          title: 'Sankt Kjelds Plads',
          searchText: 'Sankt Kjelds Plads',
        },
        {
          id: 'address-id',
          title: 'Sankt Kjelds Plads 11, 2100 København Ø',
        },
      ],
    );
  });

  it('offers partial matches without address ids as search refinements', () => {
    const partialTypes = [
      'vejnavn',
      'navngivenvejpostnummer',
      'navngivenvejpostnummerdel',
      'vejnavnhusnummer',
    ];
    for (const type of partialTypes) {
      assert.deepEqual(
        parseAddressSuggestions({
          status: 'ok',
          fund: [{ type, titel: 'Testvej 5000 Odense' }],
        }),
        [
          {
            id: `${type}:Testvej 5000 Odense`,
            title: 'Testvej 5000 Odense',
            searchText: 'Testvej 5000 Odense',
          },
        ],
      );
    }
  });

  it('ignores malformed hits and requires a real id for complete addresses', () => {
    assert.deepEqual(
      parseAddressSuggestions({
        status: 'ok',
        fund: [
          null,
          {},
          { type: 'unknown', titel: 'Unknown' },
          { type: 'husnummer', titel: 'Testvej 1' },
        ],
      }),
      [],
    );
  });

  it('maps the authoritative address fields from an id lookup', () => {
    assert.deepEqual(
      parseAddressLookup({
        status: 'ok',
        husnummer: {
          status: '3',
          vejnavn: 'Sankt Kjelds Plads',
          husnummertekst: '11',
          postnummer: { postnr: '2100', navn: 'København Ø' },
        },
      }),
      {
        street: 'Sankt Kjelds Plads',
        houseNumber: '11',
        postalCode: '2100',
        city: 'København Ø',
      },
    );
  });

  it('rejects inactive or incomplete lookup results', () => {
    assert.throws(() =>
      parseAddressLookup({
        status: 'ok',
        husnummer: { status: '5', vejnavn: 'Old Road' },
      }),
    );
  });
});
