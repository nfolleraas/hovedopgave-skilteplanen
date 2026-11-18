import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { MunicipalitiesRepository } from './municipalities.repository.js';
import { MunicipalitiesService } from './municipalities.service.js';

const municipality = {
  id: 1,
  name: 'Odense Kommune',
  region: 'Syddanmark',
  email: 'kontakt@odense.dk',
  phoneNumber: '12345678',
  address: {
    street: 'Flakhaven',
    houseNumber: '2',
    postalCode: '5000',
    city: 'Odense C',
  },
};

function createTestService() {
  const repository = {
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const service = new MunicipalitiesService(
    repository as unknown as MunicipalitiesRepository,
  );

  return { service, repository };
}

describe('MunicipalitiesService', () => {
  it('henter en kommune, der findes', async () => {
    const { service, repository } = createTestService();
    repository.findById.mockResolvedValue(municipality);

    const result = await service.findById(1);

    expect(result).toEqual(municipality);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it('giver 404, hvis kommunen ikke findes', async () => {
    const { service, repository } = createTestService();
    repository.findById.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toThrow(NotFoundException);
  });

  it('opretter en kommune med gyldige oplysninger', async () => {
    const { service, repository } = createTestService();
    repository.create.mockResolvedValue(municipality);

    const result = await service.create(municipality);

    expect(repository.create).toHaveBeenCalledWith(municipality);
    expect(result).toEqual(municipality);
  });

  it('opdaterer en kommune med gyldige oplysninger', async () => {
    const { service, repository } = createTestService();
    repository.findById.mockResolvedValue(municipality);
    repository.update.mockResolvedValue(municipality);

    const result = await service.update(1, municipality);

    expect(repository.findById).toHaveBeenCalledWith(1);
    expect(repository.update).toHaveBeenCalledWith(1, municipality);
    expect(result).toEqual(municipality);
  });

  it('afviser ugyldig email ved oprettelse', async () => {
    const { service, repository } = createTestService();

    await expect(
      service.create({
        ...municipality,
        email: 'ugyldig-email',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('afviser ugyldigt telefonnummer ved opdatering', async () => {
    const { service, repository } = createTestService();

    await expect(
      service.update(1, {
        ...municipality,
        phoneNumber: '1234567',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('afviser opdatering af en kommune, der ikke findes', async () => {
    const { service, repository } = createTestService();

    repository.findById.mockResolvedValue(null);

    await expect(service.update(999, municipality)).rejects.toThrow(
      NotFoundException,
    );

    expect(repository.update).not.toHaveBeenCalled();
  });
});
