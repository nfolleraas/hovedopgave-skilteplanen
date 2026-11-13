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
    });

    const result: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      let message = 'Kunne ikke gemme ansøger.';

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
