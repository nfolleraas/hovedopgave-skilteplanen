import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { roadPermitSubmission as application } from '../../../test/fixtures/road-permit.js';
import {
  ApplicationType,
  MaterialType,
  TrafficChange,
  Usage,
} from '../../generated/prisma/enums.js';
import { MunicipalityService } from '../municipality/municipality.service.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { RoadPermitRepository } from './road-permit.repository.js';
import { RoadPermitService } from './road-permit.service.js';

describe('RoadPermitService', () => {
  const municipalities = { exists: vi.fn() };
  const repository = {
    create: vi.fn(),
    submit: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  let service: RoadPermitService;

  beforeEach(async () => {
    vi.resetAllMocks();
    municipalities.exists.mockResolvedValue(true);
    const module = await Test.createTestingModule({
      providers: [
        RoadPermitService,
        { provide: RoadPermitRepository, useValue: repository },
        { provide: MunicipalityService, useValue: municipalities },
      ],
    }).compile();

    service = module.get(RoadPermitService);
  });

  it('creates a blank draft without mapping form fields', async () => {
    const draft = { caseNumber: 'permit-1', status: 'Draft' };
    repository.create.mockResolvedValue(draft);
    await expect(service.create()).resolves.toBe(draft);
    expect(repository.create).toHaveBeenCalledExactlyOnceWith();
  });

  it('maps a completed road permit and submits the existing case number', async () => {
    const result = { caseNumber: 'permit-1' };
    repository.submit.mockResolvedValue(result);

    await expect(service.submit('permit-1', application)).resolves.toBe(result);
    expect(repository.submit).toHaveBeenCalledExactlyOnceWith(
      'permit-1',
      expect.objectContaining({
        title: 'Road work',
        type: ApplicationType.RoadUsePermit,
        trafficChanges: [],
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

  it.each([
    [['Påbud om ensrettet færdsel'], [TrafficChange.OnewayTraffic]],
    [
      [
        'Hastighedsbegrænsning - hensyn til trafikanter og vejarbejdere',
        'Standsning og Parkering',
      ],
      [
        TrafficChange.SpeedLimitWorkZoneAndTrafficSafety,
        TrafficChange.NoStoppingAndParking,
      ],
    ],
  ])('maps all selected traffic changes %j', async (selections, changes) => {
    await service.submit('permit-1', {
      ...application,
      roadMarking: { ...application.roadMarking, trafficChanges: selections },
    });
    expect(repository.submit).toHaveBeenCalledWith(
      'permit-1',
      expect.objectContaining({ trafficChanges: changes }),
    );
  });

  it('rejects unsupported traffic changes before writing', async () => {
    await expect(
      service.submit('permit-1', {
        ...application,
        roadMarking: {
          ...application.roadMarking,
          trafficChanges: ['Unknown'],
        },
      }),
    ).rejects.toThrow('roadMarking.trafficChanges[0]');
    expect(repository.submit).not.toHaveBeenCalled();
  });

  it('maps an event permit and omits a blank applicant address', async () => {
    const eventApplication = {
      ...application,
      usageDetails: { ...application.usageDetails, usage: 'Arrangement' },
      applicant: { ...application.applicant, address1: ' ' },
    };
    await service.submit('permit-1', eventApplication);

    expect(repository.submit).toHaveBeenCalledExactlyOnceWith(
      'permit-1',
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

  it.each(Object.values(MaterialType))(
    'accepts the Prisma material type %s',
    async (type) => {
      await service.submit('permit-1', {
        ...application,
        materials: [{ ...application.materials[0], type }],
      });
      expect(repository.submit).toHaveBeenCalledWith(
        'permit-1',
        expect.objectContaining({
          roadUsePermit: {
            create: expect.objectContaining({
              materials: { create: [expect.objectContaining({ type })] },
            }),
          },
        }),
      );
    },
  );

  it.each([
    ['Stillads', MaterialType.Scaffolding],
    ['Andet', MaterialType.Other],
  ])('accepts the legacy material type %s', async (legacyType, type) => {
    await service.submit('permit-1', {
      ...application,
      materials: [{ ...application.materials[0], type: legacyType }],
    });
    expect(repository.submit).toHaveBeenCalledWith(
      'permit-1',
      expect.objectContaining({
        roadUsePermit: {
          create: expect.objectContaining({
            materials: { create: [expect.objectContaining({ type })] },
          }),
        },
      }),
    );
  });

  it('propagates a repository failure when submitting a permit', async () => {
    const error = new Error('Write failed');
    repository.submit.mockRejectedValue(error);

    await expect(service.submit('permit-1', application)).rejects.toBe(error);
  });

  it('rejects an incomplete submission without writing to the repository', async () => {
    await expect(
      service.submit('permit-1', { ...application, confirmed: false }),
    ).rejects.toThrow('confirmed must be true');
    expect(repository.submit).not.toHaveBeenCalled();
  });

  it('returns the repository draft list', () => {
    const permits = [{ caseNumber: 'permit-1' }];
    repository.findAll.mockReturnValue(permits);

    expect(service.findAll()).toBe(permits);
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('loads an older draft without a saved snapshot as empty', async () => {
    repository.findOne.mockResolvedValue({
      caseNumber: 'permit-42',
      roadPermitDraft: null,
    });

    await expect(service.findOne('permit-42')).resolves.toEqual({
      caseNumber: 'permit-42',
      roadPermitDraft: {},
    });
    expect(repository.findOne).toHaveBeenCalledExactlyOnceWith('permit-42');
  });

  it('rejects invalid submitted fields before looking up a municipality or writing', async () => {
    await expect(
      service.submit('permit-1', { ...application, title: 42 }),
    ).rejects.toThrow('title must be a string');
    await expect(
      service.submit('permit-1', {
        ...application,
        usageDetails: { ...application.usageDetails, startDate: '2026-02-30' },
      }),
    ).rejects.toThrow('usageDetails.startDate must be a valid date');
    await expect(
      service.submit('permit-1', { ...application, materials: [] }),
    ).rejects.toThrow('materials must contain at least one material');
    await expect(
      service.submit('permit-1', {
        ...application,
        materials: [{ ...application.materials[0], quantity: -1 }],
      }),
    ).rejects.toThrow('materials[0].quantity must be a positive whole number');
    await expect(
      service.submit('permit-1', {
        ...application,
        roadMarking: { ...application.roadMarking, trafficPrecautions: [] },
      }),
    ).rejects.toThrow(
      'roadMarking.trafficPrecautions must contain at least one traffic measure',
    );
    expect(municipalities.exists).not.toHaveBeenCalled();
    expect(repository.submit).not.toHaveBeenCalled();
  });

  it('rejects a municipality outside the supported list before writing', async () => {
    municipalities.exists.mockResolvedValue(false);
    await expect(service.submit('permit-1', application)).rejects.toThrow(
      'municipalityName must be a supported municipality',
    );
    expect(municipalities.exists).toHaveBeenCalledExactlyOnceWith('Odense');
    expect(repository.submit).not.toHaveBeenCalled();
  });

  it('saves unfinished fields against the case number', () => {
    const dto = new UpdateRoadPermitDto();
    dto.title = 'Updated road work';
    dto.materials = [];
    dto.roadMarking = { trafficPrecautions: [] };
    const result = { ...dto, caseNumber: 'permit-42' };
    repository.update.mockReturnValue(result);

    expect(service.update('permit-42', dto)).toBe(result);
    expect(repository.update).toHaveBeenCalledExactlyOnceWith('permit-42', dto);
  });

  it('rejects incorrect types in unfinished fields before saving', () => {
    expect(() =>
      service.update('permit-42', { usageDetails: { city: [] } }),
    ).toThrow('usageDetails.city must be a string');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('removes a permit by ID through the repository', () => {
    repository.remove.mockReturnValue('removed');

    expect(service.remove(42)).toBe('removed');
    expect(repository.remove).toHaveBeenCalledExactlyOnceWith(42);
  });
});
