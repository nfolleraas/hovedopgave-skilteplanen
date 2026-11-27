import { ValidationPipe } from '@nestjs/common';

/**
 * Validates DTOs decorated with class-validator. Applied per controller
 * because road-permit uses undecorated DTOs with its own validation.
 */
export const dtoValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
