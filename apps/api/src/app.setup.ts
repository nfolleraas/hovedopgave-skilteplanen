import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Settings shared by the running API and the e2e tests, so the tests
 * validate requests the same way as production.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  // biome-ignore lint/correctness/useHookAtTopLevel: NestJS method, not a React hook.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
