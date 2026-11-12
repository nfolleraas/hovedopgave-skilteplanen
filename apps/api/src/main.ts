import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

/**
 * Configures and starts the NestJS API and its Swagger documentation.
 * @returns A promise that resolves when the API is listening for requests
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Ansøgningsplatformen')
    .setDescription('API for Ansøgningsplatformen.dk')
    .setVersion('0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, document, {
    useGlobalPrefix: false,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
