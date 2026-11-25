type SearchResult = {
  type: string;
  id?: string;
  titel?: string;
  vejnavn?: string;
  postnr?: string;
  postdistrikt?: string;
};

export type RoadSuggestion = {
  road: string;
  postalCode: string;
  city: string;
};

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

/** Searches Adressevælger for addresses or named roads with postal districts. */
export async function searchAddresses(
  text: string,
  signal: AbortSignal,
  { limit = 5, roadsOnly = false } = {},
) {
  const params = new URLSearchParams({ tekst: text, maksimum: String(limit) });
  if (roadsOnly) params.set('maal', 'navngivenvejpostnummer');

  const data = await getAddressData<{ status: string; fund: SearchResult[] }>(
    'soeg',
    params,
    signal,
  );
  if (data.status !== 'ok' || !Array.isArray(data.fund)) {
    throw new Error('Invalid address search response');
  }
  return data.fund;
}

/** Returns one suggestion per road and postal district, including full-address matches. */
export async function findRoadSuggestions(text: string, signal: AbortSignal) {
  const results = await searchAddresses(text, signal, {
    limit: 200,
    roadsOnly: true,
  });
  const roads = new Map<string, RoadSuggestion>();
  for (const result of results) {
    if (
      result.type !== 'navngivenvejpostnummer' &&
      result.type !== 'husnummer'
    ) {
      continue;
    }

    // House-number results put the postal district at the end of the display label.
    const addressDistrict =
      result.type === 'husnummer'
        ? result.titel?.match(/,\s*(\d{4})\s+([^,]+)$/)
        : undefined;
    const road = result.vejnavn?.trim();
    const postalCode = result.postnr?.trim() || addressDistrict?.[1];
    const city = result.postdistrikt?.trim() || addressDistrict?.[2]?.trim();
    if (!road || !postalCode || !/^\d{4}$/.test(postalCode) || !city) continue;
    roads.set(`${road}|${postalCode}`, { road, postalCode, city });
  }
  return [...roads.values()];
}
