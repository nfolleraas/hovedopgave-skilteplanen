import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import { readCookie } from '../auth-cookie.utils.js';
import type { AuthenticatedRequest } from '../auth-request.types.js';
import { ALLOW_ANY_AUTHENTICATED_KEY } from '../decorators/allow-any-authenticated.decorator.js';
import { ALLOW_ONBOARDING_KEY } from '../decorators/allow-onboarding.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { JwtService } from '../jwt/jwt.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Creates a default-deny authentication guard.
   * @param reflector - The metadata reader for route authentication rules.
   * @param jwtService - The service used to validate access tokens.
   * @param config - The validated authentication and cookie configuration.
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  /**
   * Requires a valid access JWT and attaches its claims to the request.
   * @param context - The NestJS request execution context.
   * @returns True when the request contains a valid access token.
   * @throws UnauthorizedException when the cookie is missing or does not
   * contain a valid access token.
   */
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(
      request.headers.cookie,
      this.config.cookies.accessName,
    );

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    const claims = this.jwtService.verify(token);
    const allowOnboarding = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ONBOARDING_KEY,
      [context.getHandler(), context.getClass()],
    );
    const allowAnyAuthenticated = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANY_AUTHENTICATED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowOnboarding && claims.tokenUse !== 'ONBOARDING') {
      throw new UnauthorizedException('Invalid onboarding token.');
    }

    if (
      !allowOnboarding &&
      !allowAnyAuthenticated &&
      claims.tokenUse !== 'ACCESS'
    ) {
      throw new UnauthorizedException('Invalid access token.');
    }

    request.auth = claims;

    return true;
  }
}
