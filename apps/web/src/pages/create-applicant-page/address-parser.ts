import type { AddressSuggestion } from '../../api/addresses.api.js';

interface ParsedAddress {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

export function parseAddress(address: AddressSuggestion): ParsedAddress {
  if (address.type !== 'adresse' && address.type !== 'husnummer') {
    throw new Error('Vælg en adresse med husnummer fra listen.');
  }

  const parts = address.titel.split(',').map((part) => part.trim());
  const addressLine = parts[0];
  const postalCity = parts[parts.length - 1];
  const addressMatch = addressLine?.match(
    /^(.*?)\s+(\d+[A-Za-z]?(?:[-/]\d+[A-Za-z]?)?)$/,
  );
  const postalMatch = postalCity?.match(/^(\d{4})\s+(.+)$/);

  if (!addressMatch || !postalMatch) {
    throw new Error(
      'Kunne ikke læse den valgte adresse. Vælg en anden adresse.',
    );
  }

  return {
    street: addressMatch[1].trim(),
    houseNumber: addressMatch[2].trim(),
    postalCode: postalMatch[1],
    city: postalMatch[2].trim(),
  };
}
