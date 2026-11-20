import { BadRequestException, HttpStatus } from '@nestjs/common';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';

type MunicipalityValidationCode =
  | 'invalidName'
  | 'invalidEmail'
  | 'invalidPhoneNumber'
  | 'invalidAddress'
  | 'invalidPostalCode';

// Match the browser email field and require a multi-label domain.
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Includes a stable code so clients can translate validation messages. */
function validationError(
  code: MunicipalityValidationCode,
  message: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message,
    code,
  });
}

/**
 * Checks that the input is an object before the validator reads its fields.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Accepts a string with at least one non-whitespace character.
 */
function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Requires a municipality name made of letters separated by spaces.
 */
function validateName(data: unknown): asserts data is Record<string, unknown> {
  if (!isRecord(data) || !hasText(data.name)) {
    throw validationError('invalidName', 'Kommunens navn skal udfyldes');
  }

  if (!/^(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*$/u.test(data.name)) {
    throw validationError(
      'invalidName',
      'Kommunens navn må kun indeholde bogstaver og mellemrum mellem ord',
    );
  }
}

/**
 * Checks the email format and requires a phone number with eight digits.
 *
 * @throws BadRequestException if either contact field is invalid.
 */
function validateContact(data: Record<string, unknown>): void {
  if (typeof data.email !== 'string' || !emailPattern.test(data.email)) {
    throw validationError('invalidEmail', 'Ugyldig e-mailadresse');
  }

  if (
    typeof data.phoneNumber !== 'string' ||
    !/^\d{8}$/.test(data.phoneNumber)
  ) {
    throw validationError(
      'invalidPhoneNumber',
      'Telefonnummer skal bestå af 8 cifre',
    );
  }
}

/**
 * Checks the street, house number, postal code, and city. Uses the caller’s
 * error message for missing fields and a separate message for an invalid
 * postal code format.
 */
function validateAddress(
  address: unknown,
  missingAddressMessage: string,
): void {
  if (
    !isRecord(address) ||
    !hasText(address.street) ||
    !hasText(address.houseNumber) ||
    !hasText(address.postalCode) ||
    !hasText(address.city)
  ) {
    throw validationError('invalidAddress', missingAddressMessage);
  }

  if (!/^\d{4}$/.test(address.postalCode)) {
    throw validationError(
      'invalidPostalCode',
      'Postnummer skal bestå af 4 cifre',
    );
  }
}

/**
 * Validates the name, region, contact details, and address before creation.
 * Successful validation narrows the input type to CreateMunicipalityDto.
 *
 * @throws BadRequestException if any required field is invalid.
 */
export function validateCreateMunicipality(
  data: unknown,
): asserts data is CreateMunicipalityDto {
  validateName(data);

  if (!hasText(data.region)) {
    throw new BadRequestException('Region skal udfyldes');
  }

  validateContact(data);
  validateAddress(data.address, 'Kommunens adresse skal udfyldes');
}

/**
 * Validates the email address, phone number, and address before an update.
 * Successful validation narrows the input type to UpdateMunicipalityDto.
 *
 * @throws BadRequestException if any required field is invalid.
 */
export function validateUpdateMunicipality(
  data: unknown,
): asserts data is UpdateMunicipalityDto {
  if (!isRecord(data)) {
    throw new BadRequestException('Kommunens oplysninger skal udfyldes');
  }

  validateContact(data);
  validateAddress(data.address, 'Ugyldig adresse');
}
