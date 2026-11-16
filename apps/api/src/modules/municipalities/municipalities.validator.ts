import { BadRequestException } from '@nestjs/common';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';

export function validateCreateMunicipality(data: CreateMunicipalityDto): void {
  
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new BadRequestException('Kommunens navn skal udfyldes');
  }

  if (!data.region?.trim()) {
    throw new BadRequestException('Region skal udfyldes');
  }

  if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new BadRequestException('Ugyldig e-mailadresse');
  }

  if (!data.phoneNumber || !/^\d{8}$/.test(data.phoneNumber)) {
    throw new BadRequestException('Telefonnummer skal bestå af 8 cifre');
  }

  if (
    !data.address ||
    !data.address.street?.trim() ||
    !data.address.houseNumber?.trim() ||
    !data.address.postalCode?.trim() ||
    !data.address.city?.trim()
  ) {
    throw new BadRequestException('Kommunens adresse skal udfyldes');
  }

  if (!/^\d{4}$/.test(data.address.postalCode)) {
    throw new BadRequestException('Postnummer skal bestå af 4 cifre');
  }
}

export function validateUpdateMunicipality(data: UpdateMunicipalityDto): void {
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    throw new BadRequestException('Kommunens navn skal udfyldes');
  }
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

  if (
    !data.address ||
    typeof data.address.street !== 'string' ||
    !data.address.street.trim() ||
    typeof data.address.houseNumber !== 'string' ||
    !data.address.houseNumber.trim() ||
    typeof data.address.postalCode !== 'string' ||
    !/^\d{4}$/.test(data.address.postalCode) ||
    typeof data.address.city !== 'string' ||
    !data.address.city.trim()
  ) {
    throw new BadRequestException('Ugyldig adresse');
  }
}
