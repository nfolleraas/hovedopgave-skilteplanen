/** Requests JSON from the Adressevælger house-number API and rejects unsuccessful responses. */
export async function getAddressData<T>(
  path: string,
  params: URLSearchParams,
  signal: AbortSignal,
) {
  const url = new URL(path, 'https://adressevaelger.dk/husnumre/');
  // Klimadatastyrelsen publishes this shared value for Adressevælger.
  params.set('token', 'adressevaelger123');
  url.search = params.toString();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Address request failed');
  return (await response.json()) as T;
}
