import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // This is NestJS configuration, not a React hook.
  // biome-ignore lint/correctness/useHookAtTopLevel: NestJS method name starts with use.
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

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
