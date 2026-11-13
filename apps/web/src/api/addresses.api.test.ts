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
        assert.ok(options?.signal);
        assert.equal(options.signal.aborted, false);
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

  it('ignores unsupported hits', () => {
    assert.deepEqual(
      parseAddressSuggestions({
        status: 'ok',
        fund: [null, {}, { type: 'unknown', titel: 'Unknown' }],
      }),
      [],
    );
  });

  it('rejects supported suggestions with missing or blank IDs and titles', () => {
    for (const item of [
      { type: 'husnummer', titel: 'Testvej 1' },
      { type: 'husnummer', id: '   ', titel: 'Testvej 1' },
      { type: 'husnummer', id: 'address-id', titel: '   ' },
      { type: 'vejnavn', titel: '' },
    ]) {
      assert.throws(
        () => parseAddressSuggestions({ status: 'ok', fund: [item] }),
        /Invalid address suggestion/,
      );
    }
    assert.deepEqual(
      parseAddressSuggestions({
        status: 'ok',
        fund: [{ type: 'husnummer', id: ' address-id ', titel: ' Testvej 1 ' }],
      }),
      [{ id: 'address-id', title: 'Testvej 1' }],
    );
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
      assert.throws(
        () =>
          parseAddressLookup({
            status: 'ok',
            husnummer: { ...houseNumber, ...overrides },
          }),
        /incomplete/,
      );
    }
    assert.deepEqual(
      parseAddressLookup({ status: 'ok', husnummer: houseNumber }),
      {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
    );
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
          assert.equal(milliseconds, 10_000);
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
        await assert.rejects(pending, { name: 'TimeoutError' });
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
        await assert.rejects(pending, { name: 'AbortError' });
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
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
