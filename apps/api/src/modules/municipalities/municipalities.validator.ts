import { BadRequestException } from '@nestjs/common';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateName(data: unknown): asserts data is Record<string, unknown> {
  if (!isRecord(data) || !hasText(data.name)) {
    throw new BadRequestException('Kommunens navn skal udfyldes');
  }
}

function validateContact(data: Record<string, unknown>): void {
  if (
    typeof data.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    throw new BadRequestException('Ugyldig e-mailadresse');
  }

  if (
    typeof data.phoneNumber !== 'string' ||
    !/^\d{8}$/.test(data.phoneNumber)
  ) {
    throw new BadRequestException('Telefonnummer skal bestå af 8 cifre');
  }
}

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
    throw new BadRequestException(missingAddressMessage);
  }

  if (!/^\d{4}$/.test(address.postalCode)) {
    throw new BadRequestException('Postnummer skal bestå af 4 cifre');
  }
}

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

export function validateUpdateMunicipality(
  data: unknown,
): asserts data is UpdateMunicipalityDto {
  if (!isRecord(data)) {
    throw new BadRequestException('Kommunens oplysninger skal udfyldes');
  }

  validateContact(data);
  validateAddress(data.address, 'Ugyldig adresse');
}
