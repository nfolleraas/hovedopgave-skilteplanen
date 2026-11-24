import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Registers Swagger routes only in the development environment.
 * @param app - The NestJS application receiving the Swagger routes.
 * @param environment - The current Node environment.
 */
export function configureSwagger(
  app: INestApplication,
  environment = process.env.NODE_ENV,
): void {
  if (environment !== 'development') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Ansøgningsplatformen')
    .setDescription('API for Ansøgningsplatformen.dk')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, document, {
    useGlobalPrefix: false,
  });
}
