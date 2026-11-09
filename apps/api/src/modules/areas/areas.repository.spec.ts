import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AreasRepository } from './areas.repository.js';

function createPrismaMock() {
  const prisma = {
    area: { delete: vi.fn() },
    areaDetail: { delete: vi.fn() },
    areaSize: { delete: vi.fn() },
    $transaction: vi.fn(async (run: (tx: unknown) => unknown) => run(prisma)),
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
