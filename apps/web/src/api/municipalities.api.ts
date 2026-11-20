import type {
  CreateMunicipality,
  Municipality,
  UpdateMunicipality,
} from '../types/municipality.types.js';

const API_URL = '/api/municipalities';
const validationCodes = [
  'invalidEmail',
  'invalidPhoneNumber',
  'invalidAddress',
  'invalidPostalCode',
  'emailInUse',
  'phoneNumberInUse',
] as const;

/** Identifies a municipality validation error the form can translate. */
export class MunicipalityValidationError extends Error {
  readonly code: (typeof validationCodes)[number];

  constructor(code: (typeof validationCodes)[number]) {
    super(code);
    this.code = code;
  }
}

/**
 * Fetches a municipality and its address for display in the form. An abort
 * signal lets the caller cancel the request when leaving the page.
 *
 * @throws Error if the API responds with an error status.
 */
export async function getMunicipality(
  id: number,
  signal?: AbortSignal,
): Promise<Municipality> {
  const response = await fetch(`${API_URL}/${id}`, { signal });

  if (!response.ok) {
    throw new Error('Kunne ikke hente kommunen');
  }

  return response.json();
}

/**
 * Sends the municipality name, region, contact details, and address to the
 * creation endpoint.
 *
 * @returns The municipality saved by the API.
 */
export async function createMunicipality(
  data: CreateMunicipality,
): Promise<Municipality> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Kunne ikke oprette kommunen');
  }

  return response.json();
}

/**
 * Sends the address, phone number, and email address to the municipality
 * update endpoint.
 *
 * @returns The saved municipality details for display in the form.
 */
export async function updateMunicipality(
  id: number,
  data: UpdateMunicipality,
): Promise<Municipality> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 409) {
      const body: unknown = await response.json().catch(() => null);

      if (typeof body === 'object' && body !== null && 'code' in body) {
        const code = validationCodes.find(
          (candidate) => candidate === body.code,
        );
        if (code) throw new MunicipalityValidationError(code);
      }
    }

    throw new Error('Kunne ikke opdatere kommunen');
  }

  return response.json();
}
