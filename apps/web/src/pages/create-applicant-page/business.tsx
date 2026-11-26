import ApplicantForm from './applicant-form.js';

/**
 * Configures the shared creation form for business applicants.
 *
 * @returns The business applicant form with a required CVR field.
 */
export default function BusinessApplicantPage() {
  return <ApplicantForm applicantType="business" />;
}
