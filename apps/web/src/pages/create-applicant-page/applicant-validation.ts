/**
 * Checks the phone number format used by the applicant form.
 *
 * @param value - Phone number entered in the form.
 * @returns Whether the value has exactly eight digits.
 */
export function isValidPhoneNumber(value: string): boolean {
  return /^\d{8}$/.test(value);
}

/**
 * Checks the CVR number format used by the business applicant form.
 *
 * @param value - CVR number entered in the form.
 * @returns Whether the value has exactly eight digits.
 */
export function isValidCvrNumber(value: string): boolean {
  return /^\d{8}$/.test(value);
}
