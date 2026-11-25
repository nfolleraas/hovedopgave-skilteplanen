import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AreasController } from './areas.controller.js';
import { AreasService } from './areas.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { CreateAreasDto } from './dto/create-areas.dto.js';
import { FindAreasQueryDto } from './dto/find-areas-query.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

const applicationId = '3f2b8c1e-9d4a-4b7e-8a61-2c5d0e9f7a13';
const areaId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('AreasController', () => {
  const service = {
    create: vi.fn(),
    createMany: vi.fn(),
    findByApplication: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  let controller: AreasController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AreasController],
      providers: [{ provide: AreasService, useValue: service }],
    }).compile();

    controller = module.get(AreasController);
  });

  it('creates one area and returns the service result', async () => {
    const dto = new CreateAreaDto();
    const area = { uuid: areaId };
    service.create.mockResolvedValue(area);

    await expect(controller.create(dto)).resolves.toBe(area);
    expect(service.create).toHaveBeenCalledExactlyOnceWith(dto);
  });

  it('creates several areas in one request', async () => {
    const dto = new CreateAreasDto();
    const areas = [{ uuid: areaId }];
    service.createMany.mockResolvedValue(areas);

    await expect(controller.createMany(dto)).resolves.toBe(areas);
    expect(service.createMany).toHaveBeenCalledExactlyOnceWith(dto);
  });

  it('lists the areas of the application in the query', async () => {
    const result = { areas: [] };
    service.findByApplication.mockResolvedValue(result);

    await expect(controller.findByApplication({ applicationId })).resolves.toBe(
      result,
    );
    expect(service.findByApplication).toHaveBeenCalledExactlyOnceWith(
      applicationId,
    );
  });

  it('returns one area by id', async () => {
    const area = { uuid: areaId };
    service.findOne.mockResolvedValue(area);

    await expect(controller.findOne(areaId)).resolves.toBe(area);
    expect(service.findOne).toHaveBeenCalledExactlyOnceWith(areaId);
  });

  it('updates the area with the given id', async () => {
    const dto = new UpdateAreaDto();
    const area = { uuid: areaId };
    service.update.mockResolvedValue(area);

    await expect(controller.update(areaId, dto)).resolves.toBe(area);
    expect(service.update).toHaveBeenCalledExactlyOnceWith(areaId, dto);
  });

  it('removes the area with the given id', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove(areaId)).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledExactlyOnceWith(areaId);
  });

  it('propagates service failures to Nest', async () => {
    const error = new Error('Not found');
    service.findOne.mockRejectedValue(error);

    await expect(controller.findOne(areaId)).rejects.toBe(error);
  });
});

describe('FindAreasQueryDto', () => {
  // Same options as the global pipe in main.ts.
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validate = (value: unknown) =>
    pipe.transform(value, { type: 'query', metatype: FindAreasQueryDto });

  it('accepts a UUID application id', async () => {
    await expect(validate({ applicationId })).resolves.toEqual({
      applicationId,
    });
  });

  it.each([
    ['missing', {}],
    ['empty', { applicationId: '' }],
    ['not a UUID', { applicationId: 'DEV-GRAVE-1' }],
  ])('rejects an application id that is %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
