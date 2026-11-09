import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationType,
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
  Status,
} from '../../generated/prisma/enums.js';
import { AreasRepository } from './areas.repository.js';
import { AreasService } from './areas.service.js';

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

function buildArea(overrides: Record<string, unknown> = {}) {
  return {
    uuid: 'area-1',
    roadName: 'Strandvej',
    roadOwnership: RoadOwnership.Municipality,
    postalCode: '5000',
    houseNumberFrom: null,
    houseNumberTo: null,
    alternativeDescription: null,
    areaDetailId: 'detail-1',
    areaSizeId: 'size-1',
    applicationId: 'APP-1',
    areaDetail: null,
    areaSize: null,
    application: buildApplication(),
    ...overrides,
  };
}

/** An area where the applicant has filled in all details. */
function buildCompleteArea(overrides: Record<string, unknown> = {}) {
  return buildArea({
    houseNumberFrom: '10',
    houseNumberTo: '24',
    areaDetail: {
      uuid: 'detail-1',
      roadSection: RoadSection.Pavement,
      roadSectionDescription: null,
      roadSide: RoadSide.Right,
      direction: Direction.Along,
    },
    areaSize: {
      uuid: 'size-1',
      lengthInMeters: 18,
      widthInMeters: 0.6,
      depthInMeters: 1.2,
      areaInSquareMeters: 10.8,
    },
    ...overrides,
  });
}

/** What the service passes to the repository, loosely typed for checks. */
type CreateData = Record<string, any>;

function createRepositoryMock() {
  return {
    addMany: vi.fn(async (areas: CreateData[]) =>
      areas.map((data) => ({ ...buildArea(), ...data })),
    ),
    getAllByApplication: vi.fn(),
    getById: vi.fn(),
    countByApplication: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getApplication: vi.fn(),
  };
}

function notFoundError() {
  return new Prisma.PrismaClientKnownRequestError('No record was found.', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

const road = {
  roadName: 'Strandvej',
  roadOwnership: RoadOwnership.Municipality,
  postalCode: '5000',
};

const completeDetails = {
  houseNumberFrom: '10',
  houseNumberTo: '24',
  roadSection: RoadSection.Pavement,
  roadSide: RoadSide.Right,
  direction: Direction.Along,
  lengthInMeters: 18,
  widthInMeters: 0.6,
  depthInMeters: 1.2,
};

/** Road use (container) areas have no direction or depth (UC-034 A1). */
const roadUseDetails = {
  houseNumberFrom: '10',
  houseNumberTo: '24',
  roadSection: RoadSection.Pavement,
  roadSide: RoadSide.Right,
  lengthInMeters: 18,
  widthInMeters: 0.6,
};

describe('AreasService', () => {
  let service: AreasService;
  let repository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    repository = createRepositoryMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasService,
        { provide: AreasRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<AreasService>(AreasService);
  });

  describe('findByApplication', () => {
    it('returns the application with its areas', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());
      repository.getAllByApplication.mockResolvedValue([buildCompleteArea()]);

      const result = await service.findByApplication('APP-1');

      expect(result.application).toEqual(buildApplication());
      expect(result.areas).toHaveLength(1);
      expect(result.areas[0]).toMatchObject({
        uuid: 'area-1',
        roadSection: RoadSection.Pavement,
        areaInSquareMeters: 10.8,
      });
    });

    it('rejects a missing application', async () => {
      repository.getApplication.mockRejectedValue(notFoundError());

      await expect(service.findByApplication('missing')).rejects.toMatchObject({
        response: { code: 'APPLICATION_NOT_FOUND' },
      });
      expect(repository.getAllByApplication).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the area as a flat response', async () => {
      repository.getById.mockResolvedValue(buildCompleteArea());

      const area = await service.findOne('area-1');

      expect(area).toMatchObject({ uuid: 'area-1', lengthInMeters: 18 });
      expect(area).not.toHaveProperty('application');
    });

    it('rejects a missing area', async () => {
      repository.getById.mockRejectedValue(notFoundError());

      await expect(service.findOne('missing')).rejects.toMatchObject({
        response: { code: 'AREA_NOT_FOUND' },
      });
    });

    it('passes on unexpected database errors', async () => {
      const error = new Error('Connection lost');
      repository.getById.mockRejectedValue(error);

      await expect(service.findOne('area-1')).rejects.toBe(error);
    });
  });

  describe('create (UC-034 A3)', () => {
    it('creates one manual area and returns it', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      const area = await service.create({ applicationId: 'APP-1', ...road });

      expect(repository.addMany).toHaveBeenCalledTimes(1);
      expect(repository.addMany.mock.calls[0][0]).toHaveLength(1);
      expect(area).toMatchObject({ roadName: 'Strandvej' });
    });

    it('stores a complete manual area with its details', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await service.create({
        applicationId: 'APP-1',
        ...road,
        ...completeDetails,
      });

      const [[data]] = repository.addMany.mock.calls[0];
      expect(data.areaDetail).toEqual({
        create: {
          roadSection: RoadSection.Pavement,
          roadSectionDescription: null,
          roadSide: RoadSide.Right,
          direction: Direction.Along,
        },
      });
      expect(data.areaSize.create).toMatchObject({
        lengthInMeters: 18,
        widthInMeters: 0.6,
        depthInMeters: 1.2,
      });
      expect(data.areaSize.create.areaInSquareMeters).toBeCloseTo(10.8);
    });
  });

  describe('createMany (UC-034)', () => {
    it('creates one area per road without details', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await service.createMany({
        applicationId: 'APP-1',
        areas: [
          road,
          {
            roadName: 'Kirkestræde',
            roadOwnership: RoadOwnership.Private,
            postalCode: '5000',
          },
        ],
      });

      const [areas] = repository.addMany.mock.calls[0];
      expect(areas).toHaveLength(2);
      expect(areas[0]).not.toHaveProperty('areaDetail');
      expect(areas[0]).not.toHaveProperty('areaSize');
    });

    it('connects each area to the application and empties missing text', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await service.createMany({ applicationId: 'APP-1', areas: [road] });

      const [[data]] = repository.addMany.mock.calls[0];
      expect(data).toEqual({
        application: { connect: { caseNumber: 'APP-1' } },
        ...road,
        houseNumberFrom: null,
        houseNumberTo: null,
        alternativeDescription: null,
      });
    });

    it('returns the created areas', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      const areas = await service.createMany({
        applicationId: 'APP-1',
        areas: [road],
      });

      expect(areas).toEqual([
        expect.objectContaining({ roadName: 'Strandvej', roadSection: null }),
      ]);
    });

    it('rejects depth for road use applications (UC-034 A1)', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ type: ApplicationType.RoadUsePermit }),
      );

      await expect(
        service.createMany({
          applicationId: 'APP-1',
          areas: [{ ...road, depthInMeters: 1 }],
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'AREA_FIELDS_NOT_ALLOWED',
          invalidFields: ['depthInMeters'],
        },
      });
      expect(repository.addMany).not.toHaveBeenCalled();
    });

    it('rejects half-filled details so none are stored', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await expect(
        service.createMany({
          applicationId: 'APP-1',
          areas: [{ ...road, lengthInMeters: 5 }],
        }),
      ).rejects.toMatchObject({ response: { code: 'AREA_INVALID' } });
      expect(repository.addMany).not.toHaveBeenCalled();
    });

    it('saves no areas when one road is invalid', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await expect(
        service.createMany({
          applicationId: 'APP-1',
          areas: [road, { ...road, widthInMeters: 2 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.addMany).not.toHaveBeenCalled();
    });

    it('only keeps the road element description for Other', async () => {
      repository.getApplication.mockResolvedValue(buildApplication());

      await service.createMany({
        applicationId: 'APP-1',
        areas: [
          { ...road, ...completeDetails, roadSectionDescription: 'Ignoreret' },
          {
            ...road,
            ...completeDetails,
            roadSection: RoadSection.Other,
            roadSectionDescription: 'Parkeringsplads',
          },
        ],
      });

      const [[first, second]] = repository.addMany.mock.calls[0];
      expect(first.areaDetail.create.roadSectionDescription).toBeNull();
      expect(second.areaDetail.create.roadSectionDescription).toBe(
        'Parkeringsplads',
      );
    });

    it('stores no direction or depth for road use applications', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ type: ApplicationType.RoadUsePermit }),
      );

      await service.createMany({
        applicationId: 'APP-1',
        areas: [{ ...road, ...roadUseDetails }],
      });

      const [[data]] = repository.addMany.mock.calls[0];
      expect(data.areaDetail.create.direction).toBeNull();
      expect(data.areaSize.create.depthInMeters).toBeNull();
    });

    it('rejects a missing application', async () => {
      repository.getApplication.mockRejectedValue(notFoundError());

      await expect(
        service.create({ applicationId: 'missing', ...road }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects new areas when the application is not editable', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ status: Status.InProgress }),
      );

      await expect(
        service.createMany({ applicationId: 'APP-1', areas: [road] }),
      ).rejects.toMatchObject({
        response: { code: 'APPLICATION_NOT_EDITABLE' },
      });
      expect(repository.addMany).not.toHaveBeenCalled();
    });

    it('allows new areas when changes are required', async () => {
      repository.getApplication.mockResolvedValue(
        buildApplication({ status: Status.ChangeRequired }),
      );

      await service.createMany({ applicationId: 'APP-1', areas: [road] });

      expect(repository.addMany).toHaveBeenCalled();
    });
  });

  describe('update (UC-036)', () => {
    const validUpdate = {
      houseNumberFrom: '10',
      houseNumberTo: '24',
      roadSection: RoadSection.Pavement,
      roadSide: RoadSide.Right,
      direction: 'Along' as const,
      lengthInMeters: 18,
      widthInMeters: 0.6,
      depthInMeters: 1.2,
    };

    it('saves the details and recalculates the area', async () => {
      repository.getById.mockResolvedValue(buildArea());
      repository.update.mockResolvedValue(buildArea());

      await service.update('area-1', validUpdate);

      const data = repository.update.mock.calls[0][1];
      expect(data.areaSize.upsert.update.areaInSquareMeters).toBeCloseTo(10.8);
      expect(data.areaDetail.upsert.update.roadSide).toBe(RoadSide.Right);
    });

    it('creates the details the first time they are saved', async () => {
      repository.getById.mockResolvedValue(buildArea());
      repository.update.mockResolvedValue(buildArea());

      await service.update('area-1', validUpdate);

      const data = repository.update.mock.calls[0][1];
      expect(data.areaDetail.upsert.create).toEqual(
        data.areaDetail.upsert.update,
      );
      expect(data.areaSize.upsert.create).toEqual(data.areaSize.upsert.update);
    });

    it('keeps saved details that are not part of the update', async () => {
      repository.getById.mockResolvedValue(buildCompleteArea());
      repository.update.mockResolvedValue(buildCompleteArea());

      await service.update('area-1', { lengthInMeters: 25 });

      const data = repository.update.mock.calls[0][1];
      expect(data.areaSize.upsert.update).toEqual({
        lengthInMeters: 25,
        widthInMeters: 0.6,
        depthInMeters: 1.2,
        areaInSquareMeters: 15,
      });
      expect(data.areaDetail.upsert.update.roadSide).toBe(RoadSide.Right);
      // Road fields that are not sent are left as they are.
      expect(data.roadName).toBeUndefined();
    });

    it('returns the updated area', async () => {
      repository.getById.mockResolvedValue(buildCompleteArea());
      repository.update.mockResolvedValue(
        buildCompleteArea({ houseNumberTo: '30' }),
      );

      await expect(
        service.update('area-1', { houseNumberTo: '30' }),
      ).resolves.toMatchObject({ uuid: 'area-1', houseNumberTo: '30' });
    });

    it('rejects an incomplete area', async () => {
      repository.getById.mockResolvedValue(buildArea());

      await expect(
        service.update('area-1', { lengthInMeters: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('lists the missing fields', async () => {
      repository.getById.mockResolvedValue(buildCompleteArea());

      await expect(
        service.update('area-1', {
          houseNumberTo: null,
          roadSection: RoadSection.Other,
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'AREA_INVALID',
          invalidFields: ['houseNumberTo', 'roadSectionDescription'],
        },
      });
    });

    it('rejects direction and depth for container applications', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: buildApplication({
            type: ApplicationType.RoadUsePermit,
          }),
        }),
      );

      await expect(service.update('area-1', validUpdate)).rejects.toMatchObject(
        {
          response: {
            code: 'AREA_FIELDS_NOT_ALLOWED',
            invalidFields: ['direction', 'depthInMeters'],
          },
        },
      );
    });

    it('saves container areas without direction and depth', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: buildApplication({
            type: ApplicationType.RoadUsePermit,
          }),
        }),
      );
      repository.update.mockResolvedValue(buildArea());

      await service.update('area-1', roadUseDetails);

      const data = repository.update.mock.calls[0][1];
      expect(data.areaDetail.upsert.update.direction).toBeNull();
      expect(data.areaSize.upsert.update.depthInMeters).toBeNull();
    });

    it('rejects changes when the application is not editable', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: buildApplication({ status: Status.InProgress }),
        }),
      );

      await expect(
        service.update('area-1', validUpdate),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a missing area', async () => {
      repository.getById.mockRejectedValue(notFoundError());

      await expect(
        service.update('missing', validUpdate),
      ).rejects.toMatchObject({ response: { code: 'AREA_NOT_FOUND' } });
    });
  });

  describe('remove (UC-035)', () => {
    it('deletes the area', async () => {
      repository.getById.mockResolvedValue(buildArea());
      repository.countByApplication.mockResolvedValue(2);

      await service.remove('area-1');

      expect(repository.countByApplication).toHaveBeenCalledWith('APP-1');
      expect(repository.delete).toHaveBeenCalledWith('area-1');
    });

    it('deletes when changes are required', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: buildApplication({ status: Status.ChangeRequired }),
        }),
      );
      repository.countByApplication.mockResolvedValue(2);

      await service.remove('area-1');

      expect(repository.delete).toHaveBeenCalledWith('area-1');
    });

    it('does not delete the last area (UC-035 F1)', async () => {
      repository.getById.mockResolvedValue(buildArea());
      repository.countByApplication.mockResolvedValue(1);

      await expect(service.remove('area-1')).rejects.toMatchObject({
        response: { code: 'LAST_AREA' },
      });
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('does not delete when the application is not editable (UC-035 F2)', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: buildApplication({ status: Status.Approved }),
        }),
      );

      await expect(service.remove('area-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('rejects a missing area', async () => {
      repository.getById.mockRejectedValue(notFoundError());

      await expect(service.remove('missing')).rejects.toMatchObject({
        response: { code: 'AREA_NOT_FOUND' },
      });
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
