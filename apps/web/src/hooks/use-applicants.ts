export const applicantSaveError =
  'Kunne ikke gemme ansøgeren. Prøv igen senere eller kontakt support.';

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
      if (
        response.status === 502 &&
        typeof result === 'object' &&
        result !== null &&
        'code' in result &&
        result.code === 'addressLookupFailed' &&
        'message' in result &&
        typeof result.message === 'string'
      ) {
        throw new Error(result.message);
      }
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

      throw new Error(message);
    }

    return result;
  }

  return { createApplicant };
}
