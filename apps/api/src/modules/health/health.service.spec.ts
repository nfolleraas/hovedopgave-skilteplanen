import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthRepository } from './health.repository.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  let service: HealthService;
  let repository: {
    checkDatabase: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      checkDatabase: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: HealthRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a healthy status when the database responds', async () => {
    repository.checkDatabase.mockResolvedValue([{ result: 1 }]);

    await expect(service.getHealth()).resolves.toBe('Healthy');
    expect(repository.checkDatabase).toHaveBeenCalledExactlyOnceWith();
  });

  it('returns a safe 503 error when the database check fails', async () => {
    repository.checkDatabase.mockRejectedValue(
      new Error('password authentication failed for user admin'),
    );

    let exception: unknown;
    try {
      await service.getHealth();
    } catch (error) {
      exception = error;
    }

    expect(exception).toBeInstanceOf(ServiceUnavailableException);
    expect((exception as ServiceUnavailableException).getStatus()).toBe(503);
    expect((exception as ServiceUnavailableException).getResponse()).toEqual({
      statusCode: 503,
      message: 'Service unavailable',
      error: 'Service Unavailable',
    });
    expect(JSON.stringify(exception)).not.toContain('password');
  });

  it('returns a safe 503 error when the database check times out', async () => {
    vi.useFakeTimers();
    repository.checkDatabase.mockReturnValue(new Promise(() => {}));
    const assertion = expect(service.getHealth()).rejects.toMatchObject({
      message: 'Service unavailable',
      status: 503,
    });

    await vi.advanceTimersByTimeAsync(1_000);

    await assertion;
  });
});
