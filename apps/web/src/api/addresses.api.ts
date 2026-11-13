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

/** @summary Narrow an unknown value to a non-null object for response parsing. */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @summary Require nonempty text before accepting an address field. */
function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** @summary Limit address requests to ten seconds while preserving caller cancellation. */
function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(10_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * @summary Validate a search response and extract selectable house numbers
 * and suggestions that refine the address search.
 */
export function parseAddressSuggestions(data: unknown): AddressSuggestion[] {
  if (!isObject(data) || data.status !== 'ok' || !Array.isArray(data.fund)) {
    throw new Error('Invalid address search response.');
  }

  return data.fund.flatMap((item: unknown) => {
    if (!isObject(item)) return [];
    if (item.type === 'husnummer') {
      if (!isText(item.id) || !isText(item.titel)) {
        throw new Error('Invalid address suggestion.');
      }
      return [{ id: item.id.trim(), title: item.titel.trim() }];
    }
    if (
      item.type === 'vejnavn' ||
      item.type === 'navngivenvejpostnummer' ||
      item.type === 'navngivenvejpostnummerdel' ||
      item.type === 'vejnavnhusnummer'
    ) {
      if (!isText(item.titel)) {
        throw new Error('Invalid address suggestion.');
      }
      const title = item.titel.trim();
      return [
        {
          id: `${item.type}:${title}`,
          title,
          searchText: title,
        },
      ];
    }
    return [];
  });
}

/** @summary Validate and map a current, complete house-number lookup response. */
export function parseAddressLookup(data: unknown): VerifiedAddress {
  if (!isObject(data) || data.status !== 'ok' || !isObject(data.husnummer)) {
    throw new Error('Invalid address lookup response.');
  }

  const address = data.husnummer;
  const postal = address.postnummer;
  if (
    address.status !== '3' ||
    !isText(address.vejnavn) ||
    !isText(address.husnummertekst) ||
    !isObject(postal) ||
    !isText(postal.postnr) ||
    !/^\d{4}$/.test(postal.postnr.trim()) ||
    !isText(postal.navn)
  ) {
    throw new Error('Address is not current or is incomplete.');
  }

  return {
    street: address.vejnavn.trim(),
    houseNumber: address.husnummertekst.trim(),
    postalCode: postal.postnr.trim(),
    city: postal.navn.trim(),
  };
}

/** @summary Fetch up to ten address suggestions for the supplied search text. */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = new URL(`${baseUrl}/husnumre/soeg`, 'http://localhost');
  url.searchParams.set('tekst', query);
  url.searchParams.set('maksimum', '10');

  const response = await fetch(`${url.pathname}${url.search}`, {
    signal: requestSignal(signal),
  });
  if (!response.ok) throw new Error('Address search failed.');
  return parseAddressSuggestions(await response.json());
}

/** @summary Resolve a house-number ID to a verified address. */
export async function lookupAddress(
  id: string,
  signal?: AbortSignal,
): Promise<VerifiedAddress> {
  const url = `${baseUrl}/husnumre/${encodeURIComponent(id)}`;

  const response = await fetch(url, { signal: requestSignal(signal) });
  if (!response.ok) throw new Error('Address lookup failed.');
  return parseAddressLookup(await response.json());
}
