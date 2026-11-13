import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  ApplicationType,
  MaterialType,
  Usage,
} from '../../generated/prisma/enums.js';
import type { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import type { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { RoadPermitRepository } from './road-permit.repository.js';
import { RoadPermitService } from './road-permit.service.js';

const application: CreateRoadPermitDto = {
  title: 'Road work',
  municipalityName: 'Odense',
  materials: [{ id: '1', type: 'Container', quantity: 2, notes: 'Waste' }],
  usageDetails: {
    usage: 'Byggearbejde',
    startDate: '2026-11-16',
    endDate: '2026-11-18',
    road: ' Adamsgade ',
    houseNumberFrom: '5',
    houseNumberTo: '31',
    postalCode: '5000',
    city: ' Odense C ',
    locationDescription: 'Along the pavement',
  },
  contactInformation: {
    name: 'Site contact',
    phone: '12345678',
    email: 'site@example.com',
  },
  documentPlaceholder: {
    name: '',
    DocumentType: '',
    Doc_URL: '',
    DateForUpload: '',
  },
  roadMarking: { trafficChanges: [], accessWays: '', trafficPrecautions: [] },
  applicant: {
    name: 'Test applicant',
    department: '',
    address1: 'Testvej 12B',
    address2: '',
    postalCode: '8000',
    city: 'Aarhus C',
    contactPerson: '',
    directPhone: '',
    mobile: '',
    email: 'applicant@example.com',
    companyPhone: '87654321',
    cvr: '12345678',
  },
  confirmed: true,
};

describe('RoadPermitService', () => {
  const repository = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  let service: RoadPermitService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RoadPermitService,
        { provide: RoadPermitRepository, useValue: repository },
      ],
    }).compile();

    service = module.get(RoadPermitService);
  });

  it('maps a road permit and returns the saved application', async () => {
    const result = { caseNumber: 'permit-1' };
    repository.create.mockResolvedValue(result);

    await expect(service.create(application)).resolves.toBe(result);
    expect(repository.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        title: 'Road work',
        type: ApplicationType.RoadUsePermit,
        areas: {
          create: {
            roadName: 'Adamsgade',
            houseNumberFrom: '5',
            houseNumberTo: '31',
            postalCode: '5000',
            city: 'Odense C',
            alternativeDescription: 'Along the pavement',
          },
        },
        applicant: {
          create: expect.objectContaining({
            address: {
              create: {
                street: 'Testvej',
                houseNumber: '12B',
                postalCode: '8000',
                city: 'Aarhus C',
              },
            },
          }),
        },
        roadUsePermit: {
          create: expect.objectContaining({
            isEvent: false,
            usage: Usage.Construction,
            startDate: new Date('2026-11-16'),
            endDate: new Date('2026-11-18'),
            materials: {
              create: [
                {
                  type: MaterialType.Container,
                  amount: 2,
                  description: 'Waste',
                },
              ],
            },
          }),
        },
      }),
    );
  });

  it('maps an event permit and omits a blank applicant address', async () => {
    await service.create({
      ...application,
      usageDetails: { ...application.usageDetails, usage: 'Arrangement' },
      applicant: { ...application.applicant, address1: ' ' },
    });

    expect(repository.create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        type: ApplicationType.RoadUsePermitEvent,
        applicant: { create: expect.objectContaining({ address: undefined }) },
        roadUsePermit: {
          create: expect.objectContaining({
            isEvent: true,
            usage: Usage.Other,
          }),
        },
      }),
    );
  });

  it('propagates a repository failure when creating a permit', async () => {
    const error = new Error('Write failed');
    repository.create.mockRejectedValue(error);

    await expect(service.create(application)).rejects.toBe(error);
  });

  it('returns the repository permit list', () => {
    const permits = [{ caseNumber: 'permit-1' }];
    repository.findAll.mockReturnValue(permits);

    expect(service.findAll()).toBe(permits);
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('finds a permit by ID through the repository', () => {
    const permit = { caseNumber: 'permit-42' };
    repository.findOne.mockReturnValue(permit);

    expect(service.findOne(42)).toBe(permit);
    expect(repository.findOne).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('forwards the ID and changes when updating a permit', () => {
    const dto: UpdateRoadPermitDto = { title: 'Updated road work' };
    const result = { ...dto, caseNumber: 'permit-42' };
    repository.update.mockReturnValue(result);

    expect(service.update(42, dto)).toBe(result);
    expect(repository.update).toHaveBeenCalledExactlyOnceWith(42, dto);
  });

  it('removes a permit by ID through the repository', () => {
    repository.remove.mockReturnValue('removed');

    expect(service.remove(42)).toBe('removed');
    expect(repository.remove).toHaveBeenCalledExactlyOnceWith(42);
  });
});
