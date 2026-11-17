import type { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { configureSwagger } from './swagger.config.js';

describe('configureSwagger', () => {
  const app = {} as INestApplication;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers Swagger in development', () => {
    const document = { openapi: '3.0.0' };
    const createDocument = vi
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(document as never);
    const setup = vi.spyOn(SwaggerModule, 'setup').mockImplementation(() => {});

    configureSwagger(app, 'development');

    expect(createDocument).toHaveBeenCalledOnce();
    expect(setup).toHaveBeenCalledWith('swagger', app, document, {
      useGlobalPrefix: false,
    });
  });

  it.each(['production', 'test', undefined])(
    'does not register Swagger when NODE_ENV is %s',
    (environment) => {
      const createDocument = vi.spyOn(SwaggerModule, 'createDocument');
      const setup = vi.spyOn(SwaggerModule, 'setup');

      configureSwagger(app, environment);

      expect(createDocument).not.toHaveBeenCalled();
      expect(setup).not.toHaveBeenCalled();
    },
  );
});
