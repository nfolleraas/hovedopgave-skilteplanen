import type { Applicant } from '../types/applicant.types.js';

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

  constructor(status: number, fields: readonly string[]) {
    super('Profile request failed');
    this.status = status;
    this.fields = fields;
  }
}

/** Returns profile data or an error with the affected fields. */
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

/** Fetches the active profile and supports cancellation via the supplied signal. */
export function getApplicantProfile(signal: AbortSignal) {
  return requestProfile({ signal });
}

/** Saves editable profile data and returns the updated profile. */
export function updateApplicantProfile(data: ApplicantProfileInput) {
  return requestProfile({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
