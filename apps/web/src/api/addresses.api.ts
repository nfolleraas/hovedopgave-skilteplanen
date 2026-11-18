export interface AddressOption {
  id: string;
  titel: string;
  type: 'adresse' | 'husnummer' | 'navngivenvejpostnummer';
  husnummerId?: string;
}

export type AddressSuggestion = AddressOption;

/**
 * Fetches address suggestions from the API using the supplied query text. An
 * abort signal lets the caller cancel requests for outdated searches.
 */
export async function searchAddresses(
  text: string,
  signal?: AbortSignal,
): Promise<AddressOption[]> {
  const params = new URLSearchParams({ text });

  const response = await fetch(`/api/addresses/search?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Address lookup failed (${response.status})`);
  }

  return (await response.json()) as AddressOption[];
}
