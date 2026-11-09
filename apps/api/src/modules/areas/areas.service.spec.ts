import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ApplicationType,
  RoadOwnership,
  RoadSection,
  RoadSide,
  Status,
} from '../../generated/prisma/enums.js';
import { AreasRepository } from './areas.repository.js';
import { AreasService } from './areas.service.js';

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
    application: {
      caseNumber: 'APP-1',
      type: ApplicationType.ExcavationPermit,
      status: Status.Draft,
    },
    ...overrides,
  };
}

function createRepositoryMock() {
  return {
    addMany: vi.fn(async (areas: Record<string, unknown>[]) =>
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

  describe('createMany', () => {
    it('creates one area per road without details', async () => {
      repository.getApplication.mockResolvedValue(buildArea().application);

      await service.createMany({
        applicationId: 'APP-1',
        areas: [
          {
            roadName: 'Strandvej',
            roadOwnership: RoadOwnership.Municipality,
            postalCode: '5000',
          },
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
    });

    it('rejects depth for road use applications (UC-034 A1)', async () => {
      repository.getApplication.mockResolvedValue({
        caseNumber: 'APP-1',
        type: ApplicationType.RoadUsePermit,
        status: Status.Draft,
      });

      await expect(
        service.createMany({
          applicationId: 'APP-1',
          areas: [
            {
              roadName: 'Strandvej',
              roadOwnership: RoadOwnership.Municipality,
              postalCode: '5000',
              depthInMeters: 1,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a missing application', async () => {
      repository.getApplication.mockRejectedValue(notFoundError());

      await expect(
        service.create({
          applicationId: 'missing',
          roadName: 'Strandvej',
          roadOwnership: RoadOwnership.Municipality,
          postalCode: '5000',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('rejects a missing area', async () => {
      repository.getById.mockRejectedValue(notFoundError());

      await expect(service.findOne('missing')).rejects.toMatchObject({
        response: { code: 'AREA_NOT_FOUND' },
      });
    });
  });

  describe('update', () => {
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

    it('rejects an incomplete area', async () => {
      repository.getById.mockResolvedValue(buildArea());

      await expect(
        service.update('area-1', { lengthInMeters: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects direction and depth for container applications', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: {
            caseNumber: 'APP-1',
            type: ApplicationType.RoadUsePermit,
            status: Status.Draft,
          },
        }),
      );

      await expect(
        service.update('area-1', validUpdate),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects changes when the application is not editable', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: {
            caseNumber: 'APP-1',
            type: ApplicationType.ExcavationPermit,
            status: Status.InProgress,
          },
        }),
      );

      await expect(
        service.update('area-1', validUpdate),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes the area', async () => {
      repository.getById.mockResolvedValue(buildArea());
      repository.countByApplication.mockResolvedValue(2);

      await service.remove('area-1');

      expect(repository.countByApplication).toHaveBeenCalledWith('APP-1');
      expect(repository.delete).toHaveBeenCalledWith('area-1');
    });

    it('does not delete the last area', async () => {
      repository.getById.mockResolvedValue(buildArea());
      repository.countByApplication.mockResolvedValue(1);

      await expect(service.remove('area-1')).rejects.toMatchObject({
        response: { code: 'LAST_AREA' },
      });
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('does not delete when the application is not editable', async () => {
      repository.getById.mockResolvedValue(
        buildArea({
          application: {
            caseNumber: 'APP-1',
            type: ApplicationType.ExcavationPermit,
            status: Status.Approved,
          },
        }),
      );

      await expect(service.remove('area-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
