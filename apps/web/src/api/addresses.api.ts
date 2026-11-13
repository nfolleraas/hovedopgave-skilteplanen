export interface AddressOption {
  id: string;
  titel: string;
  type: 'adresse' | 'husnummer' | 'navngivenvejpostnummer';
  husnummerId?: string;
}

export type AddressSuggestion = AddressOption;

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
