import { describe, expect, it } from 'bun:test';
import { parseAddress } from '../src/pages/create-applicant-page/applicant-form';

describe('parseAddress', () => {
  it('parses a full address suggestion', () => {
    expect(
      parseAddress({
        id: 'address-1',
        type: 'adresse',
        titel: 'Vestergade 1, 8000 Aarhus C',
      }),
    ).toEqual({
      street: 'Vestergade',
      houseNumber: '1',
      postalCode: '8000',
      city: 'Aarhus C',
    });
  });

  it('parses a house-number suggestion', () => {
    expect(
      parseAddress({
        id: 'house-number-1',
        type: 'husnummer',
        titel: 'Vestergade 1, 8000 Aarhus C',
      }),
    ).toEqual({
      street: 'Vestergade',
      houseNumber: '1',
      postalCode: '8000',
      city: 'Aarhus C',
    });
  });

  it('rejects a road suggestion without a house number', () => {
    expect(() =>
      parseAddress({
        id: 'road-1',
        type: 'navngivenvejpostnummer',
        titel: 'Vestergade, 8000 Aarhus C',
      }),
    ).toThrow('Vælg en adresse med husnummer fra listen.');
  });

  it('rejects an address title it cannot parse', () => {
    expect(() =>
      parseAddress({
        id: 'address-2',
        type: 'adresse',
        titel: 'Vestergade 1',
      }),
    ).toThrow('Kunne ikke læse den valgte adresse. Vælg en anden adresse.');
  });
});
