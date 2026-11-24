import type { INestApplication } from '@nestjs/common';

/**
 * Settings shared by the running API and the e2e tests, so the tests
 * validate requests the same way as production.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // Request validation is set per controller with dtoValidationPipe(), since
  // a global ValidationPipe rejects the road-permit module's plain DTOs.
}
