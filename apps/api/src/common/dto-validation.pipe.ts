import { ValidationPipe } from '@nestjs/common';

/**
 * Validates request DTOs with class-validator decorators and rejects unknown
 * fields. It is applied per controller, not globally, because some modules
 * (such as road-permit) use plain DTO classes and validate the body
 * themselves: a global pipe would reject all their fields.
 */
export function dtoValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}
