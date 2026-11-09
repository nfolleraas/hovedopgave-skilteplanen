import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseAddressLookup,
  parseAddressSuggestions,
} from './addresses.api.js';

describe('Adressevælger response mapping', () => {
  it('only offers complete husnummer hits', () => {
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
          id: 'address-id',
          title: 'Sankt Kjelds Plads 11, 2100 København Ø',
        },
      ],
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
