import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, vi } from 'vitest';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { RoadPermitController } from './road-permit.controller.js';
import { RoadPermitService } from './road-permit.service.js';

describe('RoadPermitController', () => {
  const service = {
    create: vi.fn(),
    submit: vi.fn(),
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

  afterEach(() => vi.unstubAllEnvs());

  it('returns the blank draft created by the service', async () => {
    const draft = { caseNumber: 'permit-1', status: 'Draft' };
    service.create.mockResolvedValue(draft);

    await expect(controller.create()).resolves.toBe(draft);
    expect(service.create).toHaveBeenCalledExactlyOnceWith();
  });

  it('propagates creation failures to Nest', async () => {
    const error = new Error('Creation failed');
    service.create.mockRejectedValue(error);

    await expect(controller.create()).rejects.toBe(error);
  });

  it('submits the given case number and propagates failures to Nest', async () => {
    const dto = new CreateRoadPermitDto();
    const submitted = { caseNumber: 'permit-1', status: 'InProgress' };
    service.submit.mockResolvedValueOnce(submitted);
    await expect(controller.submit('permit-1', dto)).resolves.toBe(submitted);
    expect(service.submit).toHaveBeenCalledExactlyOnceWith('permit-1', dto);

    const error = new Error('Submission failed');
    service.submit.mockRejectedValueOnce(error);
    await expect(controller.submit('permit-1', dto)).rejects.toBe(error);
  });

  it('returns the draft list from the service in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const permits = [{ caseNumber: 'permit-1' }];
    service.findAll.mockReturnValue(permits);

    expect(controller.findAll()).toBe(permits);
    expect(service.findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('keeps the shared draft list unavailable in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(() => controller.findAll()).toThrow(NotFoundException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('passes the case number when loading a draft', () => {
    const permit = { caseNumber: 'permit-42' };
    service.findOne.mockReturnValue(permit);

    expect(controller.findOne('permit-42')).toBe(permit);
    expect(service.findOne).toHaveBeenCalledExactlyOnceWith('permit-42');
  });

  it('passes the case number and form snapshot when saving a draft', () => {
    const dto = new UpdateRoadPermitDto();
    dto.title = 'Updated road work';
    const result = { ...dto, caseNumber: 'permit-42' };
    service.update.mockReturnValue(result);

    expect(controller.update('permit-42', dto)).toBe(result);
    expect(service.update).toHaveBeenCalledExactlyOnceWith('permit-42', dto);
  });

  it('passes the route ID as a number when removing a permit', () => {
    service.remove.mockReturnValue('removed');

    expect(controller.remove('42')).toBe('removed');
    expect(service.remove).toHaveBeenCalledExactlyOnceWith(42);
  });
});
