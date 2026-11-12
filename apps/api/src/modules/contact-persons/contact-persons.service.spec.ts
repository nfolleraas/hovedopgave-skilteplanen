import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationType,
  Availability,
  Status,
} from '../../generated/prisma/enums.js';
import { ContactPersonsRepository } from './contact-persons.repository.js';
import { ContactPersonsService } from './contact-persons.service.js';

function buildApplication(
  overrides: Partial<{ type: ApplicationType; status: Status }> = {},
) {
  return {
    caseNumber: 'APP-1',
    type: ApplicationType.ExcavationPermit,
    status: Status.Draft,
    ...overrides,
  };
}

function buildContactPerson(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'contact-1',
    name: 'Jens Jensen',
    availability: Availability.Day,
    phoneNumber: '12345678',
    email: 'jens@example.com',
    applicationId: 'APP-1',
    application: buildApplication(),
    ...overrides,
  };
}

const createDto = {
  applicationId: 'APP-1',
  name: 'Jens Jensen',
  availability: Availability.Evening,
  phoneNumber: '12345678',
  email: 'jens@example.com',
};

function recordNotFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('No record found.', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

function uniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint.', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('ContactPersonsService', () => {
  let service: ContactPersonsService;
  let repository: {
    add: ReturnType<typeof vi.fn>;
    getAllByApplication: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    getApplication: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      add: vi.fn(),
      getAllByApplication: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getApplication: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactPersonsService,
        { provide: ContactPersonsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(ContactPersonsService);
  });

  describe('findByApplication', () => {
    it('returns the application with its contact persons', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());
      repository.getAllByApplication.mockResolvedValue([buildContactPerson()]);

      const result = await service.findByApplication('APP-1');

      expect(result.application.caseNumber).toBe('APP-1');
      expect(result.contactPersons).toHaveLength(1);
      expect(result.contactPersons[0]).toEqual({
        uuid: 'contact-1',
        applicationId: 'APP-1',
        name: 'Jens Jensen',
        availability: Availability.Day,
        phoneNumber: '12345678',
        email: 'jens@example.com',
      });
    });

    it('rejects a missing application', async () => {
      repository.getApplication.mockRejectedValue(recordNotFound());

      await expect(service.findByApplication('MISSING')).rejects.toMatchObject({
        response: { code: 'APPLICATION_NOT_FOUND' },
      });
    });
  });

  it('findOne rejects a missing contact person', async () => {
    repository.getById.mockRejectedValue(recordNotFound());

    await expect(service.findOne('missing')).rejects.toMatchObject({
      response: { code: 'CONTACT_PERSON_NOT_FOUND' },
    });
  });

  describe('create (UC-031)', () => {
    it('stores a complete contact person', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());
      repository.add.mockResolvedValue(
        buildContactPerson({ availability: Availability.Evening }),
      );

      const result = await service.create(createDto);

      expect(repository.add).toHaveBeenCalledWith({
        application: { connect: { caseNumber: 'APP-1' } },
        name: 'Jens Jensen',
        availability: Availability.Evening,
        phoneNumber: '12345678',
        email: 'jens@example.com',
      });
      expect(result.availability).toBe(Availability.Evening);
    });

    it('sets availability to Day for road use applications (UC-031 A1)', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ type: ApplicationType.RoadUsePermit }),
      );
      repository.add.mockResolvedValue(buildContactPerson());

      await service.create({ ...createDto, availability: undefined });

      expect(repository.add).toHaveBeenCalledWith(
        expect.objectContaining({ availability: Availability.Day }),
      );
    });

    it('rejects a chosen availability for road use applications', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ type: ApplicationType.RoadUsePermit }),
      );

      await expect(service.create(createDto)).rejects.toMatchObject({
        response: {
          code: 'CONTACT_PERSON_FIELDS_NOT_ALLOWED',
          invalidFields: ['availability'],
        },
      });
      expect(repository.add).not.toHaveBeenCalled();
    });

    it('rejects invalid fields and lists them (UC-031 F1 to F4)', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await expect(
        service.create({
          ...createDto,
          name: ' ',
          phoneNumber: '123',
          email: 'not-an-email',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'CONTACT_PERSON_INVALID',
          invalidFields: ['name', 'phoneNumber', 'email'],
        },
      });
      expect(repository.add).not.toHaveBeenCalled();
    });

    it('rejects a second contact person while the schema allows one', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());
      repository.add.mockRejectedValue(uniqueViolation());

      await expect(service.create(createDto)).rejects.toMatchObject({
        response: { code: 'CONTACT_PERSON_ALREADY_EXISTS' },
      });
    });

    it('rejects new contact persons when the application is not editable', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ status: Status.Approved }),
      );

      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.add).not.toHaveBeenCalled();
    });
  });

  describe('update (UC-033)', () => {
    it('saves the updated details', async () => {
      repository.getById.mockResolvedValue(buildContactPerson());
      repository.update.mockResolvedValue(
        buildContactPerson({ name: 'Ny Kontakt' }),
      );

      const result = await service.update('contact-1', { name: 'Ny Kontakt' });

      expect(repository.update).toHaveBeenCalledWith('contact-1', {
        name: 'Ny Kontakt',
        availability: Availability.Day,
        phoneNumber: undefined,
        email: undefined,
      });
      expect(result.name).toBe('Ny Kontakt');
    });

    it('keeps saved fields that are not part of the update', async () => {
      repository.getById.mockResolvedValue(
        buildContactPerson({ availability: Availability.Night }),
      );
      repository.update.mockResolvedValue(buildContactPerson());

      await service.update('contact-1', { phoneNumber: '87654321' });

      expect(repository.update).toHaveBeenCalledWith(
        'contact-1',
        expect.objectContaining({ availability: Availability.Night }),
      );
    });

    it('rejects an availability change for road use applications (UC-033 A1)', async () => {
      repository.getById.mockResolvedValue(
        buildContactPerson({
          application: buildApplication({
            type: ApplicationType.RoadUsePermit,
          }),
        }),
      );

      await expect(
        service.update('contact-1', { availability: Availability.Night }),
      ).rejects.toMatchObject({
        response: { code: 'CONTACT_PERSON_FIELDS_NOT_ALLOWED' },
      });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects invalid updated fields (UC-033 F1, F3, F4)', async () => {
      repository.getById.mockResolvedValue(buildContactPerson());

      await expect(
        service.update('contact-1', { email: 'invalid' }),
      ).rejects.toMatchObject({
        response: { code: 'CONTACT_PERSON_INVALID', invalidFields: ['email'] },
      });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects changes when the application is not editable', async () => {
      repository.getById.mockResolvedValue(
        buildContactPerson({
          application: buildApplication({ status: Status.InProgress }),
        }),
      );

      await expect(
        service.update('contact-1', { name: 'Ny Kontakt' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove (UC-032)', () => {
    it('deletes the contact person', async () => {
      repository.getById.mockResolvedValue(buildContactPerson());
      repository.delete.mockResolvedValue(buildContactPerson());

      await service.remove('contact-1');

      expect(repository.delete).toHaveBeenCalledWith('contact-1');
    });

    it('rejects a missing contact person', async () => {
      repository.getById.mockRejectedValue(recordNotFound());

      await expect(service.remove('missing')).rejects.toMatchObject({
        response: { code: 'CONTACT_PERSON_NOT_FOUND' },
      });
    });

    it('does not delete when the application is not editable', async () => {
      repository.getById.mockResolvedValue(
        buildContactPerson({
          application: buildApplication({ status: Status.Rejected }),
        }),
      );

      await expect(service.remove('contact-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
