import { searchAddresses as searchAdressevaelger } from '../utils/adressevaelger.js';

export interface AddressOption {
  id: string;
  titel: string;
  type: 'adresse' | 'husnummer' | 'navngivenvejpostnummer';
}

export type AddressSuggestion = AddressOption;

/** Adapts the shared Adressevælger search results to the applicant form. */
export async function searchAddresses(
  text: string,
  signal: AbortSignal,
): Promise<AddressOption[]> {
  const results = await searchAdressevaelger(text, signal);
  const options = new Map<string, AddressOption>();

  for (const { id, titel, type } of results) {
    if (!titel) continue;
    if (type === 'navngivenvejpostnummer') {
      const key = id ?? titel;
      options.set(key, { id: key, titel, type });
    } else if (type === 'husnummer' && id) {
      options.set(id, { id, titel, type });
    }
  }

  return [...options.values()];
}
