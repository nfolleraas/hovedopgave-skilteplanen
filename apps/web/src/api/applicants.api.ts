import type { Applicant } from '../types/applicant.types.js';

/**
 * Provides a placeholder result until applicant listing is implemented.
 *
 * @returns An empty applicant list.
 */
export async function getApplicants(): Promise<Applicant[]> {
  return [];
}

export interface ApplicantProfileInput {
  name: string;
  email: string;
  phoneNumber: string;
  cvrNumber?: string;
}

export interface ApplicantProfile
  extends Omit<ApplicantProfileInput, 'cvrNumber'> {
  type: 'Private' | 'Business';
  cvrNumber: string | null;
}

export class ApplicantProfileError extends Error {
  readonly status: number;
  readonly fields: readonly string[];

  /**
   * Creates a profile request error with any fields reported by the API.
   *
   * @param status - HTTP status of the failed request.
   * @param fields - Field names associated with the failure.
   */
  constructor(status: number, fields: readonly string[]) {
    super('Profile request failed');
    this.status = status;
    this.fields = fields;
  }
}

/**
 * Sends a profile request and exposes field errors from failed responses.
 *
 * @param options - Fetch options for the profile request.
 * @returns The profile returned by the API.
 * @throws {ApplicantProfileError} If the API returns a failed HTTP status.
 */
async function requestProfile(options: RequestInit): Promise<ApplicantProfile> {
  const response = await fetch('/api/applicants/profile', options);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApplicantProfileError(
      response.status,
      Array.isArray(error?.fields) ? error.fields : [],
    );
  }
  return response.json();
}

/**
 * Fetches the configured development profile.
 *
 * @param signal - Signal used to cancel the request.
 * @returns The editable applicant profile.
 */
export function getApplicantProfile(signal: AbortSignal) {
  return requestProfile({ signal });
}

/**
 * Sends the editable profile fields to the API.
 *
 * @param data - Profile changes, including CVR for a business applicant.
 * @returns The saved profile fields.
 */
export function updateApplicantProfile(data: ApplicantProfileInput) {
  return requestProfile({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
