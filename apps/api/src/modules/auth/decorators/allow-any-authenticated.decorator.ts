import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANY_AUTHENTICATED_KEY = 'auth:allow-any-authenticated';

/**
 * Allows a route to accept either an access JWT or an onboarding JWT.
 * @returns NestJS metadata for the global authentication guard.
 */
export function AllowAnyAuthenticated(): MethodDecorator & ClassDecorator {
  return SetMetadata(ALLOW_ANY_AUTHENTICATED_KEY, true);
}
