import { Test, TestingModule } from '@nestjs/testing';
import { RoadOwnership } from '../../generated/prisma/enums.js';
import { AreasController } from './areas.controller.js';
import { AreasService } from './areas.service.js';

function createServiceMock() {
  return {
    create: vi.fn(async () => ({ uuid: 'area-1' })),
    createMany: vi.fn(async () => [{ uuid: 'area-1' }]),
    findByApplication: vi.fn(async () => ({ application: {}, areas: [] })),
    findOne: vi.fn(async () => ({ uuid: 'area-1' })),
    update: vi.fn(async () => ({ uuid: 'area-1' })),
    remove: vi.fn(async () => undefined),
  };
}

const road = {
  roadName: 'Strandvej',
  roadOwnership: RoadOwnership.Municipality,
  postalCode: '5000',
};

describe('AreasController', () => {
  let controller: AreasController;
  let service: ReturnType<typeof createServiceMock>;

  beforeEach(async () => {
    service = createServiceMock();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreasController],
      providers: [{ provide: AreasService, useValue: service }],
    }).compile();

    controller = module.get<AreasController>(AreasController);
  });

  it('creates one area', async () => {
    const dto = { applicationId: 'APP-1', ...road };

    await expect(controller.create(dto)).resolves.toEqual({ uuid: 'area-1' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('creates one area per selected road', async () => {
    const dto = { applicationId: 'APP-1', areas: [road] };

    await expect(controller.createMany(dto)).resolves.toEqual([
      { uuid: 'area-1' },
    ]);
    expect(service.createMany).toHaveBeenCalledWith(dto);
  });

  it('lists the areas of an application', async () => {
    await controller.findByApplication('APP-1');
    expect(service.findByApplication).toHaveBeenCalledWith('APP-1');
  });

  it('finds one area', async () => {
    await controller.findOne('area-1');
    expect(service.findOne).toHaveBeenCalledWith('area-1');
  });

  it('updates an area', async () => {
    const dto = { lengthInMeters: 5 };

    await controller.update('area-1', dto);
    expect(service.update).toHaveBeenCalledWith('area-1', dto);
  });

  it('deletes an area', async () => {
    await expect(controller.remove('area-1')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('area-1');
  });
});
