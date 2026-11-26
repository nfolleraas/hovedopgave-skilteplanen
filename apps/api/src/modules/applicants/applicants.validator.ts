import { BadRequestException } from '@nestjs/common';
import type { Applicant } from '../../generated/prisma/client.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

const phoneOrCvrPattern = /^[0-9]{8}$/;
const emailPattern =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const personalNamePattern = /^(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*$/u;
const businessNamePattern =
  /^(?:\p{L}\p{M}*|[0-9])+(?: +(?:\p{L}\p{M}*|[0-9])+)*$/u;

function isValidName(name: string, isBusiness: boolean): boolean {
  return (isBusiness ? businessNamePattern : personalNamePattern).test(name);
}

type ProfileFields = Pick<
  Applicant,
  'name' | 'email' | 'phoneNumber' | 'cvrNumber'
>;

const houseNumberPattern = /^[0-9]+[a-z]?(?:[-/][0-9]+[a-z]?)?$/i;
const postalCodePattern = /^[0-9]{4}$/;
const addressNamePattern = /^[\p{L}\p{M}0-9 .,'’&()/-]+$/u;

function isAddressName(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    addressNamePattern.test(value) &&
    /\p{L}/u.test(value)
  );
}

export function validateProfile(
  data: unknown,
  isBusiness: boolean,
): ProfileFields {
  const input =
    typeof data === 'object' && data !== null
      ? (data as Partial<Record<keyof ProfileFields, unknown>>)
      : {};
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phoneNumber =
    typeof input.phoneNumber === 'string' ? input.phoneNumber.trim() : '';
  const cvrNumber =
    typeof input.cvrNumber === 'string' ? input.cvrNumber.trim() : '';
  const fields: (keyof ProfileFields)[] = [];

  if (!isValidName(name, isBusiness)) fields.push('name');
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
  if (!isValidName(data.name.trim(), data.type === 'business')) {
    throw new BadRequestException(
      'Name may contain letters and spaces. Business names may also contain digits.',
    );
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

  if (!isAddressName(data.street)) {
    throw new BadRequestException('Indtast et gyldigt vejnavn');
  }

  if (
    typeof data.houseNumber !== 'string' ||
    !houseNumberPattern.test(data.houseNumber)
  ) {
    throw new BadRequestException('Indtast et gyldigt husnummer');
  }

  if (
    typeof data.postalCode !== 'string' ||
    !postalCodePattern.test(data.postalCode)
  ) {
    throw new BadRequestException('Postnummer skal bestå af 4 cifre');
  }

  if (!isAddressName(data.city)) {
    throw new BadRequestException('Indtast et gyldigt bynavn');
  }
}
