import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicantsRepository } from './applicants.repository.js';
import { ApplicantsService } from './applicants.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

describe('ApplicantsService', () => {
  const repository = {
    findActiveProfile: vi.fn(),
    updateActiveProfile: vi.fn(),
    createApplicant: vi.fn(async (data: CreateApplicantDto) => ({
      uuid: 'applicant-1',
      name: data.name,
      type: data.type === 'business' ? 'Business' : 'Private',
    })),
  };

  let service: ApplicantsService;

  const validApplicant: CreateApplicantDto = {
    name: 'Testperson',
    type: 'private',
    phoneNumber: '12345678',
    email: 'Test@Example.com',
    street: 'Vestergade',
    houseNumber: '1',
    postalCode: '8000',
    city: 'Aarhus C',
  };

  beforeEach(() => {
    repository.createApplicant.mockClear();
    repository.findActiveProfile.mockReset();
    repository.updateActiveProfile.mockReset();
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    service = new ApplicantsService(
      repository as unknown as ApplicantsRepository,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('creates and logs a private applicant with valid data', async () => {
    const createdApplicant = {
      uuid: 'applicant-1',
      name: validApplicant.name,
      type: 'Private',
    };

    await expect(service.createApplicant(validApplicant)).resolves.toEqual(
      createdApplicant,
    );
    expect(repository.createApplicant).toHaveBeenCalledWith({
      ...validApplicant,
      email: 'test@example.com',
    });
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith({
      applicantName: createdApplicant.name,
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
      type: 'Private',
      change: 'created',
    });
  });

  it('creates a business applicant with a valid CVR number', async () => {
    const businessApplicant: CreateApplicantDto = {
      ...validApplicant,
      type: 'business',
      cvrNumber: '12345678',
    };

    await service.createApplicant(businessApplicant);

    expect(repository.createApplicant).toHaveBeenCalledWith({
      ...businessApplicant,
      email: 'test@example.com',
    });
    expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith({
      applicantName: businessApplicant.name,
      timestamp: expect.any(String),
      type: 'Business',
      change: 'created',
    });
  });

  it('does not log a creation when persistence fails', async () => {
    const error = new Error('Database unavailable');
    repository.createApplicant.mockRejectedValueOnce(error);

    await expect(service.createApplicant(validApplicant)).rejects.toThrow(
      error,
    );
    expect(Logger.prototype.log).not.toHaveBeenCalled();
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
    expect(Logger.prototype.log).not.toHaveBeenCalled();
  });

  it.each([{}, { email: 123 }, { email: 'test@example.com', cvrNumber: 123 }])(
    'rejects malformed creation input without calling the repository (%j)',
    async (input) => {
      await expect(
        service.createApplicant({
          ...validApplicant,
          email: undefined,
          ...input,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.createApplicant).not.toHaveBeenCalled();
    },
  );

  it('omits CVR when creating a private applicant', async () => {
    await service.createApplicant({ ...validApplicant, cvrNumber: '12345678' });

    expect(repository.createApplicant).toHaveBeenCalledWith({
      ...validApplicant,
      email: 'test@example.com',
      cvrNumber: undefined,
    });
  });

  it('rejects an invalid postal code before saving or logging', async () => {
    await expect(
      service.createApplicant({ ...validApplicant, postalCode: 'abc' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createApplicant).not.toHaveBeenCalled();
    expect(Logger.prototype.log).not.toHaveBeenCalled();
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

  describe('updating the development profile', () => {
    const applicantId = 'fb2e0cd3-a79b-45ed-a6fa-19f82ad03dcf';
    const profile = {
      name: 'Oprindeligt Navn',
      type: 'Private',
      email: 'kontakt@example.dk',
      phoneNumber: '12345678',
      cvrNumber: null,
    };
    const input = {
      name: 'Opdateret Navn',
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    };

    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('DEV_PROFILE_APPLICANT_ID', applicantId);
      repository.findActiveProfile.mockResolvedValue(profile);
    });

    it('logs the configured applicant after a successful update', async () => {
      const updated = { ...profile, ...input };
      repository.updateActiveProfile.mockResolvedValue(updated);

      await expect(
        service.updateProfile({
          ...input,
          actorApplicantId: 'other-applicant',
        }),
      ).resolves.toEqual(updated);

      expect(repository.updateActiveProfile).toHaveBeenCalledExactlyOnceWith(
        applicantId,
        'Private',
        { ...input, cvrNumber: null },
      );
      expect(Logger.prototype.log).toHaveBeenCalledExactlyOnceWith({
        actorApplicantId: applicantId,
        actorSource: 'developmentProfile',
        applicantName: updated.name,
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
        type: 'Private',
        change: 'updated',
      });
    });

    it('does not log an update when persistence fails', async () => {
      const error = new Error('Database unavailable');
      repository.updateActiveProfile.mockRejectedValue(error);

      await expect(service.updateProfile(input)).rejects.toThrow(error);
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('rejects invalid input without saving or logging', async () => {
      await expect(
        service.updateProfile({ ...input, email: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateActiveProfile).not.toHaveBeenCalled();
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('does not use the configured profile in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      await expect(service.updateProfile(input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.findActiveProfile).not.toHaveBeenCalled();
      expect(repository.updateActiveProfile).not.toHaveBeenCalled();
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });
  });
});
