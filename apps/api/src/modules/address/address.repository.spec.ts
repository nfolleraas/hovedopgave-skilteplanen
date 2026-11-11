import { PrismaService } from '../prisma/prisma.service.js';
import { AddressRepository } from './address.repository.js';

describe('AddressRepository', () => {
  it('queries for an address matching all four fields', async () => {
    const address = {
      street: 'Testvej',
      houseNumber: '12A',
      postalCode: '5000',
      city: 'Odense',
    };
    const saved = { uuid: 'address-id', ...address };
    const findFirst = vi.fn().mockResolvedValue(saved);
    const repository = new AddressRepository({
      address: { findFirst },
    } as unknown as PrismaService);

    await expect(repository.findMatching(address)).resolves.toBe(saved);
    expect(findFirst).toHaveBeenCalledExactlyOnceWith({ where: address });
  });
});
