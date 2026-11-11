export interface AddressSuggestion {
  id: string;
  title: string;
  searchText?: string;
}

export interface VerifiedAddress {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

// The development proxy adds the configured token outside the browser.
const baseUrl = '/address-lookup';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function parseAddressSuggestions(data: unknown): AddressSuggestion[] {
  if (!isObject(data) || data.status !== 'ok' || !Array.isArray(data.fund)) {
    throw new Error('Invalid address search response.');
  }

  return data.fund.flatMap((item: unknown) => {
    if (!isObject(item) || typeof item.titel !== 'string') return [];
    if (item.type === 'husnummer' && typeof item.id === 'string') {
      return [{ id: item.id, title: item.titel }];
    }
    if (
      item.type === 'vejnavn' ||
      item.type === 'navngivenvejpostnummer' ||
      item.type === 'navngivenvejpostnummerdel' ||
      item.type === 'vejnavnhusnummer'
    ) {
      return [
        {
          id: `${item.type}:${item.titel}`,
          title: item.titel,
          searchText: item.titel,
        },
      ];
    }
    return [];
  });
}

export function parseAddressLookup(data: unknown): VerifiedAddress {
  if (!isObject(data) || data.status !== 'ok' || !isObject(data.husnummer)) {
    throw new Error('Invalid address lookup response.');
  }

  const address = data.husnummer;
  const postal = address.postnummer;
  if (
    address.status !== '3' ||
    typeof address.vejnavn !== 'string' ||
    typeof address.husnummertekst !== 'string' ||
    !isObject(postal) ||
    typeof postal.postnr !== 'string' ||
    typeof postal.navn !== 'string'
  ) {
    throw new Error('Address is not current or is incomplete.');
  }

  return {
    street: address.vejnavn,
    houseNumber: address.husnummertekst,
    postalCode: postal.postnr,
    city: postal.navn,
  };
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = new URL(`${baseUrl}/husnumre/soeg`, 'http://localhost');
  url.searchParams.set('tekst', query);
  url.searchParams.set('maksimum', '10');

  const response = await fetch(`${url.pathname}${url.search}`, { signal });
  if (!response.ok) throw new Error('Address search failed.');
  return parseAddressSuggestions(await response.json());
}

export async function lookupAddress(
  id: string,
  signal?: AbortSignal,
): Promise<VerifiedAddress> {
  const url = `${baseUrl}/husnumre/${encodeURIComponent(id)}`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Address lookup failed.');
  return parseAddressLookup(await response.json());
}
