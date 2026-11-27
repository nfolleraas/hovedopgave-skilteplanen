import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthRepository } from './health.repository.js';

const HEALTH_CHECK_TIMEOUT_MS = 1_000;

@Injectable()
export class HealthService {
  constructor(private readonly healthRepository: HealthRepository) {}

  async getHealth(): Promise<string> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        this.healthRepository.checkDatabase(),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Health check timed out')),
            HEALTH_CHECK_TIMEOUT_MS,
          );
        }),
      ]);

      return 'Healthy';
    } catch {
      throw new ServiceUnavailableException('Service unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
