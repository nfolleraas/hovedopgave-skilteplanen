import {
  type INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ActorsController } from './actors.controller.js';
import { ActorsService } from './actors.service.js';

describe('ActorsController UUID validation over HTTP', () => {
  const uuid = 'd322f12b-e5cf-4b17-9ae1-53227f56e59d';
  const actor = { uuid, name: 'Actor' };
  const service = {
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ActorsController],
      providers: [{ provide: ActorsService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    for (const method of Object.values(service)) {
      method.mockReset();
      method.mockResolvedValue(actor);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'rejects a malformed UUID on %s before calling the service',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/api/actors/not-a-uuid')
        .send(method === 'patch' ? { name: 'Updated' } : undefined)
        .expect(400);

      expect(service.findOne).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
      expect(service.delete).not.toHaveBeenCalled();
    },
  );

  it('passes a valid UUID to the read service', async () => {
    await request(app.getHttpServer())
      .get(`/api/actors/${uuid}`)
      .expect(200, actor);
    expect(service.findOne).toHaveBeenCalledExactlyOnceWith(uuid);
  });

  it('passes a valid UUID and update body to the update service', async () => {
    const dto = { name: 'Updated' };
    await request(app.getHttpServer())
      .patch(`/api/actors/${uuid}`)
      .send(dto)
      .expect(200, actor);
    expect(service.update).toHaveBeenCalledExactlyOnceWith(uuid, dto);
  });

  it('passes a valid UUID to the deletion service', async () => {
    await request(app.getHttpServer())
      .delete(`/api/actors/${uuid}`)
      .expect(200, actor);
    expect(service.delete).toHaveBeenCalledExactlyOnceWith(uuid);
  });

  it('keeps the not-found response for a valid UUID with no actor', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Actor not found'));
    await request(app.getHttpServer()).get(`/api/actors/${uuid}`).expect(404);
    expect(service.findOne).toHaveBeenCalledExactlyOnceWith(uuid);
  });
});
