import ApplicantForm from './applicant-form.js';

/**
 * Configures the shared creation form for private applicants.
 *
 * @returns The private applicant form without a CVR field.
 */
export default function PrivateApplicantPage() {
  return <ApplicantForm applicantType="private" />;
}
