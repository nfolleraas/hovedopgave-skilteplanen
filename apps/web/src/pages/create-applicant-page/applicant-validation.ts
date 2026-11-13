/**
 * Checks whether a value is a Danish 8-digit phone number.
 */
export function isValidPhoneNumber(value: string): boolean {
  return /^\d{8}$/.test(value);
}

/**
 * Checks whether a value is a Danish 8-digit CVR number.
 */
export function isValidCvrNumber(value: string): boolean {
  return /^\d{8}$/.test(value);
}

