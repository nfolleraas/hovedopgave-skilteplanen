import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const HEALTH_CHECK_TIMEOUT_MS = 1_000;

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies the database responds before the health-check timeout expires.
   * @returns The healthy status message
   */
  async getHealth(): Promise<string> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
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
