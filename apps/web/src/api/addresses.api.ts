import { searchAddresses as searchAdressevaelger } from '../utils/adressevaelger.js';

export interface AddressOption {
  id: string;
  titel: string;
  type: 'husnummer' | 'navngivenvejpostnummer';
}

export type AddressSuggestion = AddressOption;

/**
 * Adapts the shared browser lookup to the municipality address field.
 *
 * @param text - Address or street name entered in the field.
 * @param signal - Cancels the lookup when the search text changes.
 * @returns Unique address and street suggestions for the field.
 */
export async function searchAddresses(
  text: string,
  signal: AbortSignal,
): Promise<AddressOption[]> {
  const results = await searchAdressevaelger(text, signal);
  const options = new Map<string, AddressOption>();

  for (const { id, titel, type } of results) {
    if (!titel) continue;

    if (type === 'husnummer' && id) {
      options.set(id, { id, titel, type });
    } else if (type === 'navngivenvejpostnummer') {
      const key = id ?? titel;
      options.set(key, { id: key, titel, type });
    }
  }

  return [...options.values()];
}
