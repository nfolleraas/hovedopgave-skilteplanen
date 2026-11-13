import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  ApplicantType,
  ApplicationType,
  TrafficChange,
  Usage,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma.service.js';
import type { CreateRoadPermitData } from './mappers/road-permit.mapper.js';
import { RoadPermitRepository } from './road-permit.repository.js';

const applicationData = {
  title: 'Road work',
  applicantReference: 'ref-1',
  type: ApplicationType.RoadUsePermit,
  trafficChange: TrafficChange.SpeedLimitWorkZone,
  applicant: {
    create: {
      name: 'Test applicant',
      type: ApplicantType.Business,
      phoneNumber: '87654321',
      email: 'applicant@example.com',
      mitIdKey: '',
    },
  },
  areas: {
    create: { roadName: 'Adamsgade', postalCode: '5000', city: 'Odense C' },
  },
} satisfies Omit<CreateRoadPermitData, 'roadUsePermit'>;

const permitData = {
  isEvent: false,
  startDate: new Date('2026-11-16'),
  endDate: new Date('2026-11-18'),
  eventStart: new Date('2026-11-16'),
  eventEnd: new Date('2026-11-18'),
  usage: Usage.Construction,
} satisfies CreateRoadPermitData['roadUsePermit']['create'];

const data: CreateRoadPermitData = {
  ...applicationData,
  roadUsePermit: { create: permitData },
};

describe('RoadPermitRepository', () => {
  const transaction = {
    application: { create: vi.fn() },
    roadUsePermit: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn((run: (tx: typeof transaction) => Promise<unknown>) =>
      run(transaction),
    ),
  };
  let repository: RoadPermitRepository;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RoadPermitRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(RoadPermitRepository);
  });

  it('creates the application and links its permit in one transaction', async () => {
    const application = { caseNumber: 'generated-case', title: 'Road work' };
    const permit = { caseNumber: application.caseNumber, ...permitData };
    transaction.application.create.mockResolvedValue(application);
    transaction.roadUsePermit.create.mockResolvedValue(permit);

    await expect(repository.create(data)).resolves.toEqual({
      ...application,
      roadUsePermit: permit,
    });
    expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
    );
    expect(transaction.application.create).toHaveBeenCalledExactlyOnceWith({
      data: applicationData,
    });
    expect(transaction.roadUsePermit.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        ...permitData,
        applicationId: application.caseNumber,
        application: { connect: { caseNumber: application.caseNumber } },
      },
    });
  });

  it('skips creating the permit when the application write fails', async () => {
    const error = new Error('Application write failed');
    transaction.application.create.mockRejectedValue(error);

    await expect(repository.create(data)).rejects.toBe(error);
    expect(transaction.roadUsePermit.create).not.toHaveBeenCalled();
  });

  it('rejects the transaction when the permit write fails', async () => {
    const error = new Error('Permit write failed');
    transaction.application.create.mockResolvedValue({
      caseNumber: 'generated-case',
    });
    transaction.roadUsePermit.create.mockRejectedValue(error);

    await expect(repository.create(data)).rejects.toBe(error);
  });
});
