import type { CreateAddressDto } from '../dto/create-address.dto.js';

/**
 * @summary Map address fields to a trimmed representation
 * shared by creation and matching.
 */
export function toAddressCreateInput(dto: CreateAddressDto) {
  return {
    street: dto.street.trim(),
    houseNumber: dto.houseNumber.trim(),
    postalCode: dto.postalCode.trim(),
    city: dto.city.trim(),
  };
}
