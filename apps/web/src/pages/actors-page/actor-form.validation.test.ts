import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ActorFormValues } from './actor.types.js';
import { validateActorForm } from './actor-form.validation.js';

const translate = (key: string) => key;
const verifiedAddressId = '0a3f507a-eedb-32b8-e044-0003ba298018';

function validBusiness(): ActorFormValues {
  return {
    role: 'Contractor',
    name: 'Østergaard Entreprise',
    phoneNumber: '12345678',
    email: 'kontakt@example.dk',
    cvrNumber: '87654321',
    department: 'Anlæg',
    contactPerson: {
      name: 'Jane Doe',
      email: 'jane@example.dk',
      phoneNumber: '11223344',
      availability: '',
    },
    address: {
      street: 'Hovedgade',
      houseNumber: '12A',
      postalCode: '8000',
      city: 'Aarhus',
    },
  };
}

describe('UC-040 actor form validation', () => {
  it('accepts a complete business actor', () => {
    assert.deepEqual(
      validateActorForm(validBusiness(), translate, verifiedAddressId),
      {},
    );
  });

  it('skips business-only fields for a private actor', () => {
    const actor = { ...validBusiness(), role: 'Private' as const };
    actor.cvrNumber = '';
    actor.department = '';
    assert.deepEqual(
      validateActorForm(actor, translate, verifiedAddressId),
      {},
    );
  });

  it('requires role, CVR and department for a business actor', () => {
    const actor = validBusiness();
    actor.role = '';
    actor.cvrNumber = '';
    actor.department = '';
    const errors = validateActorForm(actor, translate, verifiedAddressId);
    assert.equal(errors.role, 'actors.errors.role');
    assert.equal(errors.cvrNumber, 'actors.errors.cvrNumber');
    assert.equal(errors.department, 'actors.errors.department');
  });

  it('rejects invalid name, phone number, email and address', () => {
    const actor = validBusiness();
    actor.name = 'Firma 42';
    actor.phoneNumber = '1234ABCD';
    actor.email = 'not-an-email';
    actor.address.street = '';
    const errors = validateActorForm(actor, translate, verifiedAddressId);
    assert.equal(errors.name, 'actors.errors.name');
    assert.equal(errors.phoneNumber, 'actors.errors.phoneNumber');
    assert.equal(errors.email, 'actors.errors.email');
    assert.equal(errors.address, 'actors.errors.address');
  });

  it('rejects a typed address that was not selected from the register', () => {
    const errors = validateActorForm(validBusiness(), translate, null);
    assert.equal(errors.address, 'actors.errors.address');
  });

  it('requires valid contact person details for a business actor', () => {
    const actor = validBusiness();
    actor.contactPerson.name = 'Jane 42';
    actor.contactPerson.email = 'invalid';
    actor.contactPerson.phoneNumber = '1234';
    const errors = validateActorForm(actor, translate, verifiedAddressId);
    assert.equal(errors.contactPersonName, 'actors.errors.contactPersonName');
    assert.equal(errors.contactPersonEmail, 'actors.errors.email');
    assert.equal(errors.contactPersonPhoneNumber, 'actors.errors.phoneNumber');
  });

  it('requires availability for an excavation permit', () => {
    const errors = validateActorForm(
      validBusiness(),
      translate,
      verifiedAddressId,
      'ExcavationPermit',
    );
    assert.equal(
      errors.contactAvailability,
      'actors.errors.contactAvailability',
    );
  });
});
