import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import type { AuthenticatedRequest } from '../auth-request.types.js';
import { JwtService } from '../jwt/jwt.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Creates a default-deny authentication guard.
   * @param jwtService - The service used to validate access tokens.
   * @param config - The validated authentication and cookie configuration.
   */
  constructor(
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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readAccessToken(request.headers.cookie);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    const claims = this.jwtService.verify(token);

    if (claims.tokenUse !== 'ACCESS') {
      throw new UnauthorizedException('Invalid access token.');
    }

    request.auth = claims;

    return true;
  }

  /**
   * Reads the configured access-token cookie from an HTTP Cookie header.
   * @param cookieHeader - The raw Cookie header supplied by the client.
   * @returns The decoded cookie value, or undefined when it is unavailable or
   * malformed.
   */
  private readAccessToken(
    cookieHeader: string | undefined,
  ): string | undefined {
    if (!cookieHeader) {
      return undefined;
    }

    for (const cookie of cookieHeader.split(';')) {
      const separatorIndex = cookie.indexOf('=');

      if (separatorIndex < 0) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex).trim();

      if (name !== this.config.cookies.accessName) {
        continue;
      }

      const value = cookie.slice(separatorIndex + 1).trim();

      if (!value) {
        return undefined;
      }

      try {
        return decodeURIComponent(value);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }
}
