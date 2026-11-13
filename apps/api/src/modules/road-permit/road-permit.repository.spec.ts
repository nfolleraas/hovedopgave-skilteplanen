import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicantType,
  ApplicationType,
  Status,
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

const savedDraft = {
  title: 'Road work',
  municipalityName: null,
  materials: [],
  materialDraft: { type: '', quantity: '1', notes: '' },
  usageDetails: {
    usage: '',
    startDate: '',
    endDate: '',
    road: '',
    houseNumberFrom: '',
    houseNumberTo: '',
    postalCode: '',
    city: '',
    locationDescription: '',
  },
  contactInformation: { name: '', phone: '', email: '' },
  roadMarking: { trafficChanges: [], accessWays: '', trafficPrecautions: [] },
};

describe('RoadPermitRepository', () => {
  const transaction = {
    application: { updateMany: vi.fn(), update: vi.fn() },
    roadUsePermit: { create: vi.fn() },
  };
  const prisma = {
    application: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
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

  it('creates an empty application in Draft status', async () => {
    const draft = { caseNumber: 'generated-case', status: Status.Draft };
    prisma.application.create.mockResolvedValue(draft);
    await expect(repository.create()).resolves.toEqual(draft);
    expect(prisma.application.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        title: '',
        applicantReference: '',
        type: ApplicationType.RoadUsePermit,
        status: Status.Draft,
        roadPermitDraft: {},
      },
      select: { caseNumber: true, status: true },
    });
  });

  it('saves an incomplete draft against its existing case number', async () => {
    prisma.application.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      repository.update('generated-case', savedDraft),
    ).resolves.toEqual({
      caseNumber: 'generated-case',
      status: Status.Draft,
    });
    expect(prisma.application.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        caseNumber: 'generated-case',
        type: ApplicationType.RoadUsePermit,
        status: Status.Draft,
        roadUsePermit: null,
      },
      data: { title: 'Road work', roadPermitDraft: savedDraft },
    });
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('queries only Draft applications and marks the ones the permit form can open', async () => {
    prisma.application.findMany.mockResolvedValue([
      {
        caseNumber: 'draft-1',
        title: 'Road work',
        type: ApplicationType.RoadUsePermit,
        roadUsePermit: null,
      },
      {
        caseNumber: 'draft-2',
        title: 'Linked permit',
        type: ApplicationType.RoadUsePermit,
        roadUsePermit: { applicationId: 'draft-2' },
      },
    ]);

    await expect(repository.findAll()).resolves.toEqual([
      { caseNumber: 'draft-1', title: 'Road work', canResume: true },
      { caseNumber: 'draft-2', title: 'Linked permit', canResume: false },
    ]);
    expect(prisma.application.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { status: Status.Draft },
      select: {
        caseNumber: true,
        title: true,
        type: true,
        roadUsePermit: { select: { applicationId: true } },
      },
      orderBy: [{ title: 'asc' }, { caseNumber: 'asc' }],
    });
  });

  it('rejects writes against applications outside the editable draft state', async () => {
    prisma.application.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      repository.update('generated-case', savedDraft),
    ).rejects.toThrow('The application is no longer an editable draft.');
  });

  it('loads the saved draft snapshot by case number', async () => {
    const draft = {
      caseNumber: 'generated-case',
      status: Status.Draft,
      roadPermitDraft: savedDraft,
    };
    prisma.application.findFirst.mockResolvedValue(draft);
    await expect(repository.findOne('generated-case')).resolves.toEqual(draft);
    expect(prisma.application.findFirst).toHaveBeenCalledExactlyOnceWith({
      where: {
        caseNumber: 'generated-case',
        type: ApplicationType.RoadUsePermit,
        status: Status.Draft,
        roadUsePermit: null,
      },
      select: { caseNumber: true, status: true, roadPermitDraft: true },
    });
  });

  it('submits the draft and links its permit in one transaction', async () => {
    const application = {
      caseNumber: 'generated-case',
      status: Status.InProgress,
    };
    transaction.application.updateMany.mockResolvedValue({ count: 1 });
    transaction.application.update.mockResolvedValue(application);

    await expect(
      repository.submit(application.caseNumber, data),
    ).resolves.toEqual(application);
    expect(transaction.application.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        caseNumber: application.caseNumber,
        type: ApplicationType.RoadUsePermit,
        status: Status.Draft,
        roadUsePermit: null,
      },
      data: { status: Status.InProgress },
    });
    expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
    );
    expect(transaction.application.update).toHaveBeenCalledExactlyOnceWith({
      where: { caseNumber: application.caseNumber },
      data: { ...applicationData, roadPermitDraft: Prisma.DbNull },
    });
    expect(transaction.roadUsePermit.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        ...permitData,
        applicationId: application.caseNumber,
        application: { connect: { caseNumber: application.caseNumber } },
      },
    });
  });

  it('skips creating a second permit when the draft cannot be claimed', async () => {
    transaction.application.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.submit('generated-case', data)).rejects.toThrow(
      'The application is no longer an editable draft.',
    );
    expect(transaction.application.update).not.toHaveBeenCalled();
    expect(transaction.roadUsePermit.create).not.toHaveBeenCalled();
  });

  it('rejects the transaction when the permit write fails', async () => {
    const error = new Error('Permit write failed');
    transaction.application.updateMany.mockResolvedValue({ count: 1 });
    transaction.application.update.mockResolvedValue({
      caseNumber: 'generated-case',
    });
    transaction.roadUsePermit.create.mockRejectedValue(error);

    await expect(repository.submit('generated-case', data)).rejects.toBe(error);
  });
});
