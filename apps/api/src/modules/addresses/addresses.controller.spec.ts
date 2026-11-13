import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';

describe('AddressesController', () => {
  let controller: AddressesController;
  const service = {
    searchAddresses: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
    service.searchAddresses.mockReset();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates search requests to the service', async () => {
    service.searchAddresses.mockResolvedValue([]);

    await expect(controller.searchAddresses('Vestergade')).resolves.toEqual([]);
    expect(service.searchAddresses).toHaveBeenCalledWith('Vestergade');
  });
});
