import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AreasRepository } from './areas.repository.js';

const areaInclude = { areaDetail: true, areaSize: true };

function createPrismaMock() {
  const prisma = {
    area: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    areaDetail: { delete: vi.fn() },
    areaSize: { delete: vi.fn() },
    application: { findUniqueOrThrow: vi.fn() },
    $transaction: vi.fn(async (run: unknown) =>
      // Prisma accepts either a list of queries or a callback.
      Array.isArray(run)
        ? Promise.all(run)
        : (run as (tx: unknown) => unknown)(prisma),
    ),
  };
  return prisma;
}

describe('AreasRepository', () => {
  let repository: AreasRepository;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<AreasRepository>(AreasRepository);
  });

  describe('addMany', () => {
    it('creates all areas in one transaction with their details', async () => {
      prisma.area.create.mockImplementation(async ({ data }) => ({
        uuid: `uuid-${data.roadName}`,
      }));

      const created = await repository.addMany([
        { roadName: 'Strandvej' } as never,
        { roadName: 'Havnegade' } as never,
      ]);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.area.create).toHaveBeenNthCalledWith(1, {
        data: { roadName: 'Strandvej' },
        include: areaInclude,
      });
      expect(created).toEqual([
        { uuid: 'uuid-Strandvej' },
        { uuid: 'uuid-Havnegade' },
      ]);
    });
  });

  it('lists the areas of an application in a stable order', async () => {
    prisma.area.findMany.mockResolvedValue([]);

    await repository.getAllByApplication('APP-1');

    expect(prisma.area.findMany).toHaveBeenCalledWith({
      where: { applicationId: 'APP-1' },
      include: areaInclude,
      orderBy: { uuid: 'asc' },
    });
  });

  it('gets an area with its application', async () => {
    prisma.area.findUniqueOrThrow.mockResolvedValue({ uuid: 'area-1' });

    await repository.getById('area-1');

    expect(prisma.area.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { uuid: 'area-1' },
      include: { ...areaInclude, application: true },
    });
  });

  it('counts the areas of an application', async () => {
    prisma.area.count.mockResolvedValue(3);

    await expect(repository.countByApplication('APP-1')).resolves.toBe(3);
    expect(prisma.area.count).toHaveBeenCalledWith({
      where: { applicationId: 'APP-1' },
    });
  });

  it('updates an area and returns it with its details', async () => {
    prisma.area.update.mockResolvedValue({ uuid: 'area-1' });

    await repository.update('area-1', { roadName: 'Ny vej' });

    expect(prisma.area.update).toHaveBeenCalledWith({
      where: { uuid: 'area-1' },
      data: { roadName: 'Ny vej' },
      include: areaInclude,
    });
  });

  it('only reads the application fields the rules need', async () => {
    prisma.application.findUniqueOrThrow.mockResolvedValue({});

    await repository.getApplication('APP-1');

    expect(prisma.application.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { caseNumber: 'APP-1' },
      select: { caseNumber: true, type: true, status: true },
    });
  });

  describe('delete', () => {
    it('deletes the area with its detail and size records', async () => {
      prisma.area.delete.mockResolvedValue({
        uuid: 'area-1',
        areaDetailId: 'detail-1',
        areaSizeId: 'size-1',
      });

      await repository.delete('area-1');

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

    it('deletes the area before the records it points to', async () => {
      prisma.area.delete.mockResolvedValue({
        uuid: 'area-1',
        areaDetailId: 'detail-1',
        areaSizeId: 'size-1',
      });

      await repository.delete('area-1');

      const [areaOrder] = prisma.area.delete.mock.invocationCallOrder;
      const [detailOrder] = prisma.areaDetail.delete.mock.invocationCallOrder;
      expect(areaOrder).toBeLessThan(detailOrder);
    });

    it('skips detail and size records the area does not have', async () => {
      prisma.area.delete.mockResolvedValue({
        uuid: 'area-1',
        areaDetailId: null,
        areaSizeId: null,
      });

      await repository.delete('area-1');

      expect(prisma.areaDetail.delete).not.toHaveBeenCalled();
      expect(prisma.areaSize.delete).not.toHaveBeenCalled();
    });
  });
});
