import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicantsRepository } from './applicants.repository.js';
import { ApplicantsService } from './applicants.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

describe('ApplicantsService', () => {
  const repository = {
    createApplicant: vi.fn(async (_data: CreateApplicantDto) => ({
      uuid: 'applicant-1',
    })),
  };

  let service: ApplicantsService;

  const validApplicant: CreateApplicantDto = {
    name: 'Testperson',
    type: 'private',
    phoneNumber: '12345678',
    email: 'test@example.com',
    street: 'Vestergade',
    houseNumber: '1',
    postalCode: '8000',
    city: 'Aarhus C',
  };

  beforeEach(() => {
    repository.createApplicant.mockClear();
    service = new ApplicantsService(
      repository as unknown as ApplicantsRepository,
    );
  });

  it('creates an applicant with valid data', async () => {
    const createdApplicant = { uuid: 'applicant-1' };
    repository.createApplicant.mockResolvedValue(createdApplicant);

    await expect(service.createApplicant(validApplicant)).resolves.toEqual(
      createdApplicant,
    );
    expect(repository.createApplicant).toHaveBeenCalledWith(validApplicant);
  });

  it('creates a business applicant with a valid CVR number', async () => {
    const businessApplicant: CreateApplicantDto = {
      ...validApplicant,
      type: 'business',
      cvrNumber: '12345678',
    };

    await service.createApplicant(businessApplicant);

    expect(repository.createApplicant).toHaveBeenCalledWith(businessApplicant);
  });

  it('rejects an invalid business CVR without calling the repository', async () => {
    const invalidApplicant: CreateApplicantDto = {
      ...validApplicant,
      type: 'business',
      cvrNumber: '123',
    };

    await expect(
      service.createApplicant(invalidApplicant),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createApplicant).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without calling the repository', async () => {
    const invalidApplicant: CreateApplicantDto = {
      ...validApplicant,
      email: 'not-an-email',
    };

    await expect(
      service.createApplicant(invalidApplicant),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createApplicant).not.toHaveBeenCalled();
  });
});
