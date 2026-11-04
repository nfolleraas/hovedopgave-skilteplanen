import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ApplicationType,
  RoadOwnership,
  RoadSection,
  RoadSide,
  Status,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
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

function createPrismaMock() {
  const prisma = {
    application: { findUnique: vi.fn() },
    area: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn((args) => ({ ...buildArea(), ...args.data })),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    areaDetail: { delete: vi.fn() },
    areaSize: { delete: vi.fn() },
    $transaction: vi.fn(async (input: unknown) =>
      typeof input === 'function' ? input(prisma) : Promise.all(input as []),
    ),
  };
  return prisma;
}

describe('AreasService', () => {
  let service: AreasService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AreasService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AreasService>(AreasService);
  });

  describe('createMany', () => {
    it('creates one area per road without details', async () => {
      prisma.application.findUnique.mockResolvedValue(buildArea().application);

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

      expect(prisma.area.create).toHaveBeenCalledTimes(2);
      expect(prisma.area.create.mock.calls[0][0].data).not.toHaveProperty(
        'areaDetail',
      );
    });

    it('rejects detail fields for event applications', async () => {
      prisma.application.findUnique.mockResolvedValue({
        caseNumber: 'APP-1',
        type: ApplicationType.RoadUsePermitEvent,
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
              lengthInMeters: 4,
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a missing application', async () => {
      prisma.application.findUnique.mockResolvedValue(null);

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
      prisma.area.findUnique.mockResolvedValue(buildArea());
      prisma.area.update.mockImplementation(async () => buildArea());

      await service.update('area-1', validUpdate);

      const data = prisma.area.update.mock.calls[0][0].data;
      expect(data.areaSize.upsert.update.areaInSquareMeters).toBeCloseTo(10.8);
      expect(data.areaDetail.upsert.update.roadSide).toBe(RoadSide.Right);
    });

    it('rejects an incomplete area', async () => {
      prisma.area.findUnique.mockResolvedValue(buildArea());

      await expect(
        service.update('area-1', { lengthInMeters: 5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.area.update).not.toHaveBeenCalled();
    });

    it('rejects direction and depth for container applications', async () => {
      prisma.area.findUnique.mockResolvedValue(
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
      prisma.area.findUnique.mockResolvedValue(
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
    it('deletes the area with its detail and size records', async () => {
      prisma.area.findUnique.mockResolvedValue(buildArea());
      prisma.area.count.mockResolvedValue(2);

      await service.remove('area-1');

      expect(prisma.area.delete).toHaveBeenCalledWith({
        where: { uuid: 'area-1' },
      });
      expect(prisma.areaDetail.delete).toHaveBeenCalledWith({
        where: { uuid: 'detail-1' },
      });
      expect(prisma.areaSize.delete).toHaveBeenCalledWith({
        where: { uuid: 'size-1' },
      });
    });

    it('does not delete the last area', async () => {
      prisma.area.findUnique.mockResolvedValue(buildArea());
      prisma.area.count.mockResolvedValue(1);

      await expect(service.remove('area-1')).rejects.toMatchObject({
        response: { code: 'LAST_AREA' },
      });
      expect(prisma.area.delete).not.toHaveBeenCalled();
    });

    it('does not delete when the application is not editable', async () => {
      prisma.area.findUnique.mockResolvedValue(
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
      expect(prisma.area.delete).not.toHaveBeenCalled();
    });
  });
});
