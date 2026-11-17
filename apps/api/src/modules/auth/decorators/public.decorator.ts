import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:is-public';

/**
 * Marks a route as accessible without an access JWT.
 * @returns NestJS metadata for the global authentication guard.
 */
export function Public(): MethodDecorator & ClassDecorator {
  return SetMetadata(IS_PUBLIC_KEY, true);
}
