import { Injectable } from '@nestjs/common';
import type { Address } from '../../generated/prisma/client.js';
import { AddressRepository } from './address.repository.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { toAddressCreateInput } from './mappers/address.mapper.js';

@Injectable()
export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  /**
   * Finds a reusable address after normalizing its fields.
   * @param address - Address fields to normalize and match
   * @returns A matching stored address, or null if none exists
   */
  findMatching(address: CreateAddressDto): Promise<Address | null> {
    return this.addressRepository.findMatching(toAddressCreateInput(address));
  }
}
