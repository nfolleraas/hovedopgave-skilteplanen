import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let service: {
    getHealth: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      getHealth: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: service }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the health status from the service', async () => {
    service.getHealth.mockResolvedValue('Healthy');

    await expect(controller.getHealth()).resolves.toBe('Healthy');
    expect(service.getHealth).toHaveBeenCalledOnce();
  });
});
