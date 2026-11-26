export const applicantSaveError =
  'Kunne ikke gemme ansøgeren. Prøv igen senere eller kontakt support.';

export class ApplicantSaveError extends Error {
  constructor(
    message: string,
    readonly field: 'email' | 'cvrNumber',
  ) {
    super(message);
  }
}

export interface CreateApplicantInput {
  name: string;
  type: 'business' | 'private';
  phoneNumber: string;
  email: string;
  cvrNumber?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

export interface ApplicantsActions {
  createApplicant(data: CreateApplicantInput): Promise<unknown>;
}

/**
 * Provides applicant-related API actions for the UI.
 */
export function useApplicants(): ApplicantsActions {
  /**
   * Creates a new applicant via the API and throws a user-friendly Error on
   * failure.
   */
  async function createApplicant(data: CreateApplicantInput): Promise<unknown> {
    const response = await fetch('/api/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((error: unknown) => {
      throw new Error(applicantSaveError, { cause: error });
    });

    const result: unknown = await response.json().catch(() => undefined);

    if (response.status >= 500) {
      throw new Error(applicantSaveError);
    }

    if (!response.ok) {
      let message = applicantSaveError;

      if (
        typeof result === 'object' &&
        result !== null &&
        'message' in result
      ) {
        const apiMessage = result.message;
        if (typeof apiMessage === 'string') {
          message = apiMessage;
        } else if (Array.isArray(apiMessage)) {
          message = apiMessage.join(', ');
        }
      }

      if (
        typeof result === 'object' &&
        result !== null &&
        'fields' in result &&
        Array.isArray(result.fields)
      ) {
        const [field] = result.fields;
        if (field === 'email' || field === 'cvrNumber') {
          throw new ApplicantSaveError(message, field);
        }
      }
      throw new Error(message);
    }

    return result;
  }

  return { createApplicant };
}
