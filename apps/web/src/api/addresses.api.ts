export interface AddressSuggestion {
  id: string;
  titel: string;
  type: string;
  husnummerId: string;
}

export async function searchAddresses(
  text: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ text });

  const response = await fetch(`/api/addresses/search?${params}`, { signal });

  if (!response.ok) {
    throw new Error('Address lookup failed');
  }

  return response.json();
}
