import { BadRequestException } from '@nestjs/common';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

const phoneOrCvrPattern = /^[0-9]{8}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProfileField = 'name' | 'email' | 'phoneNumber' | 'cvrNumber';

export function validateProfile(data: unknown, isBusiness: boolean) {
  const input =
    typeof data === 'object' && data !== null
      ? (data as Partial<Record<ProfileField, unknown>>)
      : {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phoneNumber =
    typeof input.phoneNumber === 'string' ? input.phoneNumber.trim() : '';
  const cvrNumber =
    typeof input.cvrNumber === 'string' ? input.cvrNumber.trim() : '';
  const fields: ProfileField[] = [];

  if (!name) fields.push('name');
  if (!emailPattern.test(email)) fields.push('email');
  if (!phoneOrCvrPattern.test(phoneNumber)) fields.push('phoneNumber');
  if (isBusiness && !phoneOrCvrPattern.test(cvrNumber))
    fields.push('cvrNumber');

  if (fields.length) {
    throw new BadRequestException({
      message: 'Invalid profile fields',
      fields,
    });
  }

  return { name, email, phoneNumber, cvrNumber: isBusiness ? cvrNumber : null };
}

/**
 * Validates applicant creation input at the service boundary.
 */
export function validateCreateApplicant(
  input: unknown,
): asserts input is CreateApplicantDto {
  if (typeof input !== 'object' || input === null) {
    throw new BadRequestException('Applicant data is required');
  }

  const data = input as Partial<Record<keyof CreateApplicantDto, unknown>>;
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new BadRequestException('Name is required');
  }

  if (data.type !== 'private' && data.type !== 'business') {
    throw new BadRequestException('Invalid applicant type');
  }

  if (
    typeof data.phoneNumber !== 'string' ||
    !phoneOrCvrPattern.test(data.phoneNumber)
  ) {
    throw new BadRequestException('Phone number must contain 8 digits');
  }

  if (typeof data.email !== 'string' || !emailPattern.test(data.email.trim())) {
    throw new BadRequestException('Invalid email address');
  }

  const invalidCvr =
    data.type === 'business'
      ? typeof data.cvrNumber !== 'string' ||
        !phoneOrCvrPattern.test(data.cvrNumber.trim())
      : data.cvrNumber !== undefined && typeof data.cvrNumber !== 'string';
  if (invalidCvr) {
    throw new BadRequestException('CVR number must contain 8 digits');
  }

  if (typeof data.street !== 'string' || !data.street.trim()) {
    throw new BadRequestException('Street is required');
  }

  if (typeof data.houseNumber !== 'string' || !data.houseNumber.trim()) {
    throw new BadRequestException('House number is required');
  }

  if (typeof data.postalCode !== 'string' || !data.postalCode.trim()) {
    throw new BadRequestException('Postal code is required');
  }

  if (typeof data.city !== 'string' || !data.city.trim()) {
    throw new BadRequestException('City is required');
  }
}
