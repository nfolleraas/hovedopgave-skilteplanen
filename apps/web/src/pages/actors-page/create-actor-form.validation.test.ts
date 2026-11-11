import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CreateActorValues } from './actor.types.js';
import {
  toActorSubmission,
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
