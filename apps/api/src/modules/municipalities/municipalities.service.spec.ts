import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

/**
 * Creates a municipality service with a mock repository so tests can verify
 * service calls without connecting to the database.
 */
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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

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

  it('opretter og logger en kommune med gyldige oplysninger', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { service, repository } = createTestService();
    repository.create.mockResolvedValue(municipality);

    const result = await service.create(municipality);

    expect(repository.create).toHaveBeenCalledWith(municipality);
    expect(result).toEqual(municipality);
    expect(log).toHaveBeenCalledExactlyOnceWith({
      municipalityName: municipality.name,
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
      type: 'municipality',
      change: 'created',
      municipalityId: municipality.id,
    });
  });

  it('logger kun en oprettelse, når kommunen er gemt', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { service, repository } = createTestService();
    const error = new Error('Databasen kunne ikke gemme kommunen');
    repository.create.mockRejectedValue(error);

    await expect(service.create(municipality)).rejects.toThrow(error);
    expect(log).not.toHaveBeenCalled();
  });

  it('logger opdateringen med det konfigurerede mock-medarbejdernummer', async () => {
    vi.stubEnv('MUNICIPALITY_DEMO_EMPLOYEE_NUMBER', 'DEMO-001');
    const { service, repository } = createTestService();
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    repository.update.mockResolvedValue({
      municipality,
      changedFields: ['email'],
    });

    const result = await service.update(1, municipality);

    expect(repository.update).toHaveBeenCalledWith(1, municipality);
    expect(result).toEqual(municipality);
    expect(log).toHaveBeenCalledExactlyOnceWith({
      municipalityId: municipality.id,
      employeeNumber: 'DEMO-001',
      employeeNumberSource: 'mock',
      timestamp: expect.any(String),
      type: 'municipality',
      change: 'updated',
      changedFields: ['email'],
    });
  });

  it('bruger ikke mock-medarbejdernummeret i produktion', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MUNICIPALITY_DEMO_EMPLOYEE_NUMBER', 'DEMO-001');
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { service, repository } = createTestService();
    repository.update.mockResolvedValue({
      municipality,
      changedFields: ['email'],
    });

    await service.update(1, municipality);

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeNumber: null,
        employeeNumberSource: 'unavailable',
      }),
    );
  });

  it('logger ikke en opdatering uden ændringer', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { service, repository } = createTestService();
    repository.update.mockResolvedValue({ municipality, changedFields: [] });

    await expect(service.update(1, municipality)).resolves.toEqual(
      municipality,
    );
    expect(log).not.toHaveBeenCalled();
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

    repository.update.mockRejectedValue(new NotFoundException());

    await expect(service.update(999, municipality)).rejects.toThrow(
      NotFoundException,
    );
  });
});
