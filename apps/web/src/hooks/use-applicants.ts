import type { Applicant } from '../types/applicant.types.js';

export function useApplicants(): {
  applicants: Applicant[];
  isLoading: boolean;
} {
  return { applicants: [], isLoading: false };
}
