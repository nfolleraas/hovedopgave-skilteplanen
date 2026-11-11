import { PrismaService } from '../prisma/prisma.service.js';
import { HealthRepository } from './health.repository.js';

describe('HealthRepository', () => {
  const queryRaw = vi.fn();
  let repository: HealthRepository;

  beforeEach(() => {
    queryRaw.mockReset();
    repository = new HealthRepository({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
  });

  it('checks database connectivity with SELECT 1', async () => {
    const result = [{ result: 1 }];
    queryRaw.mockResolvedValue(result);

    await expect(repository.checkDatabase()).resolves.toBe(result);
    expect(queryRaw).toHaveBeenCalledExactlyOnceWith(['SELECT 1']);
  });

  it('propagates database failures to the service', async () => {
    const error = new Error('Database unavailable');
    queryRaw.mockRejectedValue(error);

    await expect(repository.checkDatabase()).rejects.toBe(error);
  });
});
