import { Injectable } from '@nestjs/common';
import { AddressRepository } from './address.repository.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { toAddressCreateInput } from './mappers/address.mapper.js';

@Injectable()
export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  /** @summary Find a reusable address after normalizing its fields. */
  findMatching(address: CreateAddressDto) {
    return this.addressRepository.findMatching(toAddressCreateInput(address));
  }
}
