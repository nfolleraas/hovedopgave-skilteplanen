import ApplicantForm from './applicant-form.js';

/**
 * Renders the applicant form configured for private applicants.
 */
export default function PrivateApplicantPage() {
  return <ApplicantForm applicantType="private" />;
}
