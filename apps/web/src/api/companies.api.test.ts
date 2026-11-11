import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lookupCompany, parseCompanyLookup } from './companies.api.js';

const company = {
  vat: 30714024,
  name: ' Eksempel A/S ',
  address: ' Testvej 12A, 1. th. ',
  zipcode: 5000,
  city: ' Odense ',
  phone: '+45 12 34 56 78',
  email: ' kontakt@example.com ',
};

describe('APICVR lookup', () => {
  it('maps the public company fields and separates street from house number', () => {
    assert.deepEqual(parseCompanyLookup(company, '30714024'), {
      cvrNumber: '30714024',
      name: 'Eksempel A/S',
      phoneNumber: '12345678',
      email: 'kontakt@example.com',
      address: {
        street: 'Testvej',
        houseNumber: '12A',
        postalCode: '5000',
        city: 'Odense',
      },
      addressId: 'cvr:30714024',
    });
  });

  it('handles numbered street names, house number letters and ranges', () => {
    for (const [address, street, houseNumber] of [
      ['10. Februar Vej 12 A', '10. Februar Vej', '12A'],
      ['Testvej 12A-14B, 2', 'Testvej', '12A-14B'],
      ['Stoltenbergsgade 5, 4', 'Stoltenbergsgade', '5'],
    ]) {
      assert.deepEqual(
        parseCompanyLookup({ ...company, address }, '30714024').address,
        { street, houseNumber, postalCode: '5000', city: 'Odense' },
      );
    }
  });

  it('leaves unavailable phone, email and addresses empty', () => {
    const result = parseCompanyLookup(
      {
        ...company,
        phone: null,
        email: null,
        address: null,
      },
      '30714024',
    );
    assert.equal(result.phoneNumber, '');
    assert.equal(result.email, '');
    assert.equal(result.address, null);
    assert.equal(result.addressId, null);
  });

  it('does not invent address fields for an incomplete or unrecognized address', () => {
    for (const overrides of [
      { address: 'Ukendt adresse' },
      { zipcode: null },
      { city: null },
    ]) {
      const result = parseCompanyLookup(
        { ...company, ...overrides },
        '30714024',
      );
      assert.equal(result.address, null);
      assert.equal(result.addressId, null);
    }
  });

  it('rejects malformed responses and results for a different CVR number', () => {
    for (const data of [
      null,
      {},
      { ...company, name: null },
      { ...company, vat: 12345678 },
    ]) {
      assert.throws(
        () => parseCompanyLookup(data, '30714024'),
        /ugyldigt svar/,
      );
    }
  });

  it('preserves leading zeros in CVR numbers', () => {
    assert.equal(
      parseCompanyLookup({ ...company, vat: 123456 }, '00123456').cvrNumber,
      '00123456',
    );
  });

  it('calls APICVR directly without credentials or a backend proxy', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    try {
      globalThis.fetch = async (input, options) => {
        assert.equal(input, 'https://apicvr.dk/api/v1/30714024');
        assert.equal(options?.body, undefined);
        assert.equal(options?.headers, undefined);
        assert.ok(options?.signal);
        return Response.json(company);
      };
      assert.equal(
        (await lookupCompany('30714024', controller.signal)).name,
        'Eksempel A/S',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects invalid CVR input without sending a request', async () => {
    const originalFetch = globalThis.fetch;
    let requests = 0;
    try {
      globalThis.fetch = async () => {
        requests++;
        return Response.json(company);
      };
      for (const value of ['1234567', '123456789', 'abcdefgh', '']) {
        await assert.rejects(lookupCompany(value), /8 cifre/);
      }
      assert.equal(requests, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('shows a not-found error and handles unavailable services', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(null, { status: 404 });
      await assert.rejects(lookupCompany('30714024'), /ikke fundet/);
      globalThis.fetch = async () => new Response(null, { status: 502 });
      await assert.rejects(lookupCompany('30714024'), /kunne ikke hentes/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('cancels an in-flight lookup when the form changes CVR number', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    try {
      globalThis.fetch = (_input, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(options.signal?.reason),
            { once: true },
          );
        });
      const pending = lookupCompany('30714024', controller.signal);
      controller.abort();
      await assert.rejects(pending, { name: 'AbortError' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
