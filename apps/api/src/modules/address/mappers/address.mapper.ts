import type { Prisma } from '../../../generated/prisma/client.js';
import type { CreateAddressDto } from '../dto/create-address.dto.js';

/**
 * Maps address fields to a trimmed representation shared by creation and
 * matching.
 * @param dto - Address fields to normalize
 * @returns Prisma address creation data with trimmed fields
 */
export function toAddressCreateInput(
  dto: CreateAddressDto,
): Prisma.AddressCreateInput {
  return {
    street: dto.street.trim(),
    houseNumber: dto.houseNumber.trim(),
    postalCode: dto.postalCode.trim(),
    city: dto.city.trim(),
  };
}
