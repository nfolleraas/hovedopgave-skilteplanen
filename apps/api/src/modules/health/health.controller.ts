import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Reports whether the API and its database connection are healthy.
   * @returns The API health status
   */
  @Get()
  async getHealth(): Promise<string> {
    return await this.healthService.getHealth();
  }
}
