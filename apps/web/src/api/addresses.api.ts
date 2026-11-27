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

/**
 * Builds a direct Adressevælger URL using the configured public browser token.
 * @param path - House-number endpoint path
 * @returns The authenticated address lookup URL
 */
function addressUrl(path: string): URL {
  const token = import.meta.env.VITE_DATAFORSYNINGEN_TOKEN?.trim();
  if (!token) throw new Error('Address search is not configured.');
  const url = new URL(path, 'https://adressevaelger.dk/husnumre/');
  url.searchParams.set('token', token);
  return url;
}

/**
 * Narrows an unknown value to a non-null object for response parsing.
 * @param value - Response value to check
 * @returns Whether the value is a non-null object that is not an array
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Requires nonempty text before accepting an address field.
 * @param value - Address field to check
 * @returns Whether the value is a string containing non-whitespace text
 */
function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Limits address requests to ten seconds while preserving caller cancellation.
 * @param signal - Optional caller cancellation signal
 * @returns A signal that aborts on timeout or caller cancellation
 */
function requestSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(10_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Validates a search response and extracts selectable house numbers and
 * suggestions that refine the address search.
 * @param data - Untrusted address search response
 * @returns Selectable house numbers and suggestions that refine the search
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

/**
 * Validates and maps a current, complete house-number lookup response.
 * @param data - Untrusted house-number lookup response
 * @returns The verified address with normalized fields
 */
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

/**
 * Fetches up to ten address suggestions for the supplied search text.
 * @param query - Address search text
 * @param signal - Optional signal to cancel the request
 * @returns Up to ten address suggestions
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = addressUrl('soeg');
  url.searchParams.set('tekst', query);
  url.searchParams.set('maksimum', '10');

  const response = await fetch(url.toString(), {
    signal: requestSignal(signal),
  });
  if (!response.ok) throw new Error('Address search failed.');
  return parseAddressSuggestions(await response.json());
}

/**
 * Resolves a house-number ID to a verified address.
 * @param id - House-number ID to resolve
 * @param signal - Optional signal to cancel the request
 * @returns The verified address for the selected house number
 */
export async function lookupAddress(
  id: string,
  signal?: AbortSignal,
): Promise<VerifiedAddress> {
  const url = addressUrl(encodeURIComponent(id));

  const response = await fetch(url.toString(), {
    signal: requestSignal(signal),
  });
  if (!response.ok) throw new Error('Address lookup failed.');
  return parseAddressLookup(await response.json());
}
