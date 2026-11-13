import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { RoadPermitController } from './road-permit.controller.js';
import { RoadPermitService } from './road-permit.service.js';

describe('RoadPermitController', () => {
  const service = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  let controller: RoadPermitController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [RoadPermitController],
      providers: [{ provide: RoadPermitService, useValue: service }],
    }).compile();

    controller = module.get(RoadPermitController);
  });

  it('forwards the submitted application to the service', async () => {
    const dto = new CreateRoadPermitDto();
    dto.title = 'Road work';
    service.create.mockResolvedValue({ caseNumber: 'permit-1' });

    await expect(controller.create(dto)).resolves.toBeUndefined();
    expect(service.create).toHaveBeenCalledExactlyOnceWith(dto);
  });

  it('propagates creation failures to Nest', async () => {
    const error = new Error('Creation failed');
    service.create.mockRejectedValue(error);

    await expect(controller.create(new CreateRoadPermitDto())).rejects.toBe(
      error,
    );
  });

  it('returns the permit list from the service', () => {
    const permits = [{ caseNumber: 'permit-1' }];
    service.findAll.mockReturnValue(permits);

    expect(controller.findAll()).toBe(permits);
    expect(service.findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('passes the route ID as a number when finding a permit', () => {
    const permit = { caseNumber: 'permit-42' };
    service.findOne.mockReturnValue(permit);

    expect(controller.findOne('42')).toBe(permit);
    expect(service.findOne).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('passes the numeric route ID and request body when updating a permit', () => {
    const dto: UpdateRoadPermitDto = { title: 'Updated road work' };
    const result = { ...dto, caseNumber: 'permit-42' };
    service.update.mockReturnValue(result);

    expect(controller.update('42', dto)).toBe(result);
    expect(service.update).toHaveBeenCalledExactlyOnceWith(42, dto);
  });

  it('passes the route ID as a number when removing a permit', () => {
    service.remove.mockReturnValue('removed');

    expect(controller.remove('42')).toBe('removed');
    expect(service.remove).toHaveBeenCalledExactlyOnceWith(42);
  });
});
