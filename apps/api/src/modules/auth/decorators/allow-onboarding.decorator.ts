import { SetMetadata } from '@nestjs/common';

export const ALLOW_ONBOARDING_KEY = 'auth:allow-onboarding';

/**
 * Restricts a route to a valid onboarding JWT.
 * @returns NestJS metadata for the global authentication guard.
 */
export function AllowOnboarding(): MethodDecorator & ClassDecorator {
  return SetMetadata(ALLOW_ONBOARDING_KEY, true);
}
