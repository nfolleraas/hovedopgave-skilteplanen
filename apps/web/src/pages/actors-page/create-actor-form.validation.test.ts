import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CreateActorValues } from './actor.types.js';
import {
  toActorSubmission,
  validateActorCvr,
  validateCreateActor,
} from './create-actor-form.validation.js';

const privateActor: CreateActorValues = {
  role: 'Private',
  name: ' Jane Doe ',
  phoneNumber: '01234567',
  email: ' jane@example.com ',
  address: {
    street: ' Testvej ',
    houseNumber: ' 1 ',
    postalCode: ' 5000 ',
    city: ' Odense ',
  },
  addressId: 'selected-address-id',
  cvrNumber: '',
  department: '',
};

describe('create actor form', () => {
  it('trims private actors and excludes hidden business fields', () => {
    const values = {
      ...privateActor,
      cvrNumber: '12345678',
      department: '87654321',
    };
    assert.deepEqual(validateCreateActor(values), {});
    assert.deepEqual(toActorSubmission(values), {
      role: 'Private',
      name: 'Jane Doe',
      phoneNumber: '01234567',
      email: 'jane@example.com',
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
    });
  });

  it('requires a role and rejects whitespace-only common fields', () => {
    const errors = validateCreateActor({
      ...privateActor,
      role: '',
      name: ' ',
      address: null,
      addressId: null,
    });
    assert.ok(errors.role);
    assert.ok(errors.name);
    assert.ok(errors.address);
  });

  it('requires an address selected from the API and prevents invalid submissions', () => {
    const unverified = { ...privateActor, addressId: null };
    assert.ok(validateCreateActor(unverified).address);
    assert.throws(() => toActorSubmission(unverified), /Vælg en adresse/);
    const incomplete = {
      ...privateActor,
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: ' ',
      },
    };
    assert.ok(validateCreateActor(incomplete).address);
    assert.throws(() => toActorSubmission(incomplete), /Vælg en adresse/);
  });

  it('requires all business fields and exactly eight digits', () => {
    const errors = validateCreateActor({
      ...privateActor,
      role: 'Contractor',
      phoneNumber: '1234567',
      cvrNumber: '123456789',
      department: 'abcdefgh',
    });
    for (const field of ['phoneNumber', 'cvrNumber'] as const) {
      assert.ok(errors[field]);
    }
  });

  it('preserves leading zeros in business fields and rejects invalid email', () => {
    const values: CreateActorValues = {
      ...privateActor,
      role: 'Supplier',
      cvrNumber: '00123456',
      department: '00001234',
    };
    assert.deepEqual(validateCreateActor(values), {});
    assert.equal(toActorSubmission(values).department, '00001234');
    assert.equal(
      Object.hasOwn(toActorSubmission(values), 'contactPerson'),
      false,
    );
    assert.ok(validateCreateActor({ ...values, email: 'invalid' }).email);
  });

  it('saves a business actor without contact details', () => {
    const values: CreateActorValues = {
      ...privateActor,
      role: 'Contractor',
      cvrNumber: '12345678',
      department: 'Anlæg',
    };
    assert.deepEqual(validateCreateActor(values), {});
    assert.deepEqual(toActorSubmission(values), {
      role: 'Contractor',
      name: 'Jane Doe',
      phoneNumber: '01234567',
      email: 'jane@example.com',
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
      cvrNumber: '12345678',
      department: 'Anlæg',
    });
  });
});

describe('actor CVR verification before saving', () => {
  it('skips lookup for private actors and malformed CVR numbers', async () => {
    const originalFetch = globalThis.fetch;
    let requests = 0;
    try {
      globalThis.fetch = async () => {
        requests++;
        throw new Error('Unexpected lookup');
      };
      assert.equal(await validateActorCvr(privateActor), undefined);
      assert.match(
        (await validateActorCvr({
          role: 'Supplier',
          cvrNumber: '123',
        })) ?? '',
        /8 cifre/,
      );
      assert.equal(requests, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('accepts a CVR number confirmed by the API and checks changed numbers', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input) => {
        assert.equal(input, 'https://apicvr.dk/api/v1/00123456');
        return Response.json({ vat: 123456, name: 'Eksempel A/S' });
      };
      assert.equal(
        await validateActorCvr({ role: 'Supplier', cvrNumber: ' 00123456 ' }),
        undefined,
      );
      globalThis.fetch = async (input) => {
        assert.equal(input, 'https://apicvr.dk/api/v1/87654321');
        return new Response(null, { status: 404 });
      };
      assert.match(
        (await validateActorCvr({
          role: 'Supplier',
          cvrNumber: '87654321',
        })) ?? '',
        /ikke fundet/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('blocks saving when lookup fails or returns a different company', async () => {
    const originalFetch = globalThis.fetch;
    const values = { role: 'Supplier', cvrNumber: '12345678' } as const;
    try {
      for (const status of [404, 502]) {
        globalThis.fetch = async () => new Response(null, { status });
        assert.ok(await validateActorCvr(values));
      }
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch');
      };
      assert.match((await validateActorCvr(values)) ?? '', /Prøv igen/);
      globalThis.fetch = async () =>
        Response.json({ vat: 87654321, name: 'Forkert virksomhed' });
      assert.match((await validateActorCvr(values)) ?? '', /ugyldigt svar/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
