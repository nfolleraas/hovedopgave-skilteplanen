import type { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicantType,
  ApplicationType,
  TrafficChange,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplicationsRepository } from './applications.repository.js';

describe('ApplicationsRepository', () => {
  const create = vi.fn();
  const update = vi.fn();
  const deleteApplication = vi.fn();
  const findUnique = vi.fn();
  const findMany = vi.fn();
  let repository: ApplicationsRepository;

  const data: Prisma.ApplicationCreateInput = {
    caseNumber: 'CASE-123',
    title: 'Test application',
    applicantReference: 'REF-123',
    type: ApplicationType.RoadUsePermit,
    trafficChange: TrafficChange.SpeedLimitWorkZone,
    applicant: {
      create: {
        name: 'Test Applicant',
        type: ApplicantType.Private,
        phoneNumber: '12345678',
        email: 'applicant@example.com',
        mitIdKey: 'test-mit-id',
        address: {
          create: {
            street: 'Testvej',
            houseNumber: '1',
            postalCode: '5000',
            city: 'Odense',
          },
        },
      },
    },
  };

  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    deleteApplication.mockReset();
    findUnique.mockReset();
    findMany.mockReset();
    repository = new ApplicationsRepository({
      application: {
        create,
        update,
        delete: deleteApplication,
        findUnique,
        findMany,
      },
    } as unknown as PrismaService);
  });

  it('creates an application and returns the saved record', async () => {
    const saved = { caseNumber: 'CASE-123', title: 'Test application' };
    create.mockResolvedValue(saved);

    await expect(repository.create(data)).resolves.toBe(saved);
    expect(create).toHaveBeenCalledExactlyOnceWith({ data });
  });

  it('updates an application using its case number', async () => {
    const changes = { title: 'Updated application' };
    const saved = { caseNumber: 'CASE-123', ...changes };
    update.mockResolvedValue(saved);

    await expect(repository.update('CASE-123', changes)).resolves.toBe(saved);
    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { caseNumber: 'CASE-123' },
      data: changes,
    });
  });

  it('deletes an application using its case number', async () => {
    const deleted = { caseNumber: 'CASE-123' };
    deleteApplication.mockResolvedValue(deleted);

    await expect(repository.delete('CASE-123')).resolves.toBe(deleted);
    expect(deleteApplication).toHaveBeenCalledExactlyOnceWith({
      where: { caseNumber: 'CASE-123' },
    });
  });

  it('gets an application using its case number', async () => {
    const application = {
      caseNumber: 'CASE-123',
      type: ApplicationType.RoadUsePermit,
    };
    findUnique.mockResolvedValue(application);

    await expect(repository.get('CASE-123')).resolves.toBe(application);
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { caseNumber: 'CASE-123' },
    });
  });

  it('returns null when the application does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.get('missing-case')).resolves.toBeNull();
  });

  it('gets all applications', async () => {
    const applications = [{ caseNumber: 'CASE-123' }];
    findMany.mockResolvedValue(applications);

    await expect(repository.getAll()).resolves.toBe(applications);
    expect(findMany).toHaveBeenCalledExactlyOnceWith();
  });

  it('returns an empty list when there are no applications', async () => {
    findMany.mockResolvedValue([]);

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it('propagates database errors from writes', async () => {
    const error = new Error('Database write failed');
    create.mockRejectedValue(error);
    update.mockRejectedValue(error);
    deleteApplication.mockRejectedValue(error);

    await expect(repository.create(data)).rejects.toBe(error);
    await expect(
      repository.update('CASE-123', { title: 'Updated' }),
    ).rejects.toBe(error);
    await expect(repository.delete('CASE-123')).rejects.toBe(error);
  });

  it('propagates database errors from reads', async () => {
    const error = new Error('Database unavailable');
    findUnique.mockRejectedValue(error);
    findMany.mockRejectedValue(error);

    await expect(repository.get('CASE-123')).rejects.toBe(error);
    await expect(repository.getAll()).rejects.toBe(error);
  });
});
