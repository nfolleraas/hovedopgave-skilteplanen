import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ApplicantsRepository } from './applicants.repository.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

describe('ApplicantsRepository', () => {
  const createdApplicant = { uuid: 'applicant-1' };
  const create = vi.fn(async (_args: unknown) => createdApplicant);
  const prisma = { applicant: { create } };
  const repository = new ApplicantsRepository(
    prisma as unknown as PrismaService,
  );

  const applicantData: CreateApplicantDto = {
    name: 'Testvirksomhed',
    type: 'business',
    phoneNumber: '12345678',
    email: 'test@example.com',
    cvrNumber: '87654321',
    street: 'Vestergade',
    houseNumber: '1',
    postalCode: '8000',
    city: 'Aarhus C',
  };

  beforeEach(() => {
    create.mockClear();
  });

  it('creates an applicant with a nested address', async () => {
    await expect(repository.createApplicant(applicantData)).resolves.toEqual(
      createdApplicant,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        name: 'Testvirksomhed',
        type: 'Business',
        phoneNumber: '12345678',
        email: 'test@example.com',
        cvrNumber: '87654321',
        mitIdKey: null,
        address: {
          create: {
            street: 'Vestergade',
            houseNumber: '1',
            postalCode: '8000',
            city: 'Aarhus C',
          },
        },
      },
    });
  });
});
