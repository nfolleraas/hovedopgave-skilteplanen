import { describe, expect, it } from 'vitest';
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
    expect(parseCompanyLookup(company, '30714024')).toStrictEqual({
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
      expect(
        parseCompanyLookup({ ...company, address }, '30714024').address,
      ).toStrictEqual({
        street,
        houseNumber,
        postalCode: '5000',
        city: 'Odense',
      });
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
    expect(result.phoneNumber).toBe('');
    expect(result.email).toBe('');
    expect(result.address).toBe(null);
    expect(result.addressId).toBe(null);
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
      expect(result.address).toBe(null);
      expect(result.addressId).toBe(null);
    }
  });

  it('rejects malformed responses and results for a different CVR number', () => {
    for (const data of [
      null,
      {},
      { ...company, name: null },
      { ...company, vat: 12345678 },
    ]) {
      expect(() => parseCompanyLookup(data, '30714024')).toThrow(
        /ugyldigt svar/,
      );
    }
  });

  it('preserves leading zeros in CVR numbers', () => {
    expect(
      parseCompanyLookup({ ...company, vat: 123456 }, '00123456').cvrNumber,
    ).toBe('00123456');
  });

  it('calls APICVR directly without credentials or a backend proxy', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();
    try {
      globalThis.fetch = async (input, options) => {
        expect(input).toBe('https://apicvr.dk/api/v1/30714024');
        expect(options?.body).toBe(undefined);
        expect(options?.headers).toBe(undefined);
        expect(options?.signal).toBeTruthy();
        return Response.json(company);
      };
      expect((await lookupCompany('30714024', controller.signal)).name).toBe(
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
        await expect(lookupCompany(value)).rejects.toThrow(/8 cifre/);
      }
      expect(requests).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('shows a not-found error and handles unavailable services', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(null, { status: 404 });
      await expect(lookupCompany('30714024')).rejects.toThrow(/ikke fundet/);
      globalThis.fetch = async () => new Response(null, { status: 502 });
      await expect(lookupCompany('30714024')).rejects.toThrow(
        /kunne ikke hentes/,
      );
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
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
