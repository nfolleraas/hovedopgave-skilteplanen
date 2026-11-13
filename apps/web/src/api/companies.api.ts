import type { VerifiedAddress } from './addresses.api.js';

export interface CompanyDetails {
  cvrNumber: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: VerifiedAddress | null;
  addressId: string | null;
}

/**
 * @summary Look up an eight-digit CVR number with a ten-second timeout
 * and return normalized company details.
 */
export async function lookupCompany(
  cvrNumber: string,
  signal?: AbortSignal,
): Promise<CompanyDetails> {
  if (!/^\d{8}$/.test(cvrNumber)) {
    throw new Error('Angiv præcis 8 cifre i CVR-nummeret.');
  }
  const response = await fetch(`https://apicvr.dk/api/v1/${cvrNumber}`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
  if (response.status === 404) {
    throw new Error('Der blev ikke fundet en virksomhed med det CVR-nummer.');
  }
  if (!response.ok) {
    throw new Error(
      'Virksomhedens oplysninger kunne ikke hentes. Prøv igen eller udfyld felterne manuelt.',
    );
  }
  return parseCompanyLookup(await response.json(), cvrNumber);
}

/** @summary Narrow an unknown value to a non-null object for response parsing. */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** @summary Trim string values and represent non-string values as empty text. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @summary Validate the company response against the requested CVR number
 * and normalize contact details and any usable address for the actor form.
 */
export function parseCompanyLookup(
  data: unknown,
  cvrNumber: string,
): CompanyDetails {
  if (
    !isObject(data) ||
    !['number', 'string'].includes(typeof data.vat) ||
    String(data.vat).padStart(8, '0') !== cvrNumber ||
    !text(data.name)
  ) {
    throw new Error('CVR-opslaget gav et ugyldigt svar. Prøv igen.');
  }
  // APICVR supplies one address line including floor/door after a comma.
  // The actor address model stores only street, house number, postal code and city.
  const streetAndNumber = text(data.address).split(',')[0].trim();
  const parts = streetAndNumber.match(
    /^(.+?)\s+(\d+\s*[a-zæøå]?(?:\s*-\s*\d+\s*[a-zæøå]?)?)$/iu,
  );
  const postalCode =
    typeof data.zipcode === 'number'
      ? String(data.zipcode)
      : text(data.zipcode);
  const city = text(data.city);
  const address: VerifiedAddress | null =
    parts && /^\d{4}$/.test(postalCode) && city
      ? {
          street: parts[1].trim(),
          houseNumber: parts[2].replace(/\s/g, ''),
          postalCode,
          city,
        }
      : null;
  return {
    cvrNumber,
    name: text(data.name),
    phoneNumber: text(data.phone)
      .replace(/^(?:\+45|0045)\s*/, '')
      .replace(/\s/g, ''),
    email: text(data.email),
    address,
    // This identifies a CVR-verified selection, not a DAR lookup id.
    addressId: address ? `cvr:${cvrNumber}` : null,
  };
}
