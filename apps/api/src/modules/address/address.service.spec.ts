import { Test, TestingModule } from '@nestjs/testing';
import { AddressRepository } from './address.repository.js';
import { AddressService } from './address.service.js';

describe('AddressService', () => {
  let service: AddressService;
  const findMatching = vi.fn();

  beforeEach(async () => {
    findMatching.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: AddressRepository, useValue: { findMatching } },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('looks up all four trimmed address fields and returns the matching address', async () => {
    const address = {
      street: 'Testvej',
      houseNumber: '12A',
      postalCode: '5000',
      city: 'Odense',
    };
    const saved = { uuid: 'address-id', ...address };
    findMatching.mockResolvedValue(saved);

    await expect(
      service.findMatching({
        street: ' Testvej ',
        houseNumber: ' 12A ',
        postalCode: ' 5000 ',
        city: ' Odense ',
      }),
    ).resolves.toBe(saved);
    expect(findMatching).toHaveBeenCalledExactlyOnceWith(address);
  });

  it('returns null when no address matches', async () => {
    findMatching.mockResolvedValue(null);

    await expect(
      service.findMatching({
        street: 'Testvej',
        houseNumber: '12A',
        postalCode: '5000',
        city: 'Odense',
      }),
    ).resolves.toBeNull();
  });
});
