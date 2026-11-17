import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CurrentAuthSession } from './auth.types.js';
import type { JwtClaims } from './jwt/jwt.types.js';
import { RefreshTokenService } from './refresh-token/refresh-token.service.js';
import type {
  RefreshSessionTokens,
  RefreshTokenPrincipal,
} from './refresh-token/refresh-token.types.js';

@Injectable()
export class AuthService {
  /**
   * Creates the authentication application service.
   * @param refreshTokenService - The service managing refresh-token sessions.
   */
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  /**
   * Returns the stable authentication state represented by validated claims.
   * @param claims - The claims attached by the authentication guard.
   * @returns The current principal and token purpose.
   */
  me(claims: JwtClaims): CurrentAuthSession {
    return {
      subject: claims.subject,
      actor: claims.actor,
      tokenUse: claims.tokenUse,
    };
  }

  /**
   * Revokes the current refresh token when one is present.
   * @param refreshToken - The opaque refresh token from the request cookie.
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenService.revoke(refreshToken);
    }
  }

  /**
   * Rotates a refresh token and issues replacement session tokens.
   * @param refreshToken - The opaque refresh token from the request cookie.
   * @returns The replacement access and refresh tokens.
   * @throws UnauthorizedException when the cookie is missing.
   */
  refresh(refreshToken: string | undefined): Promise<RefreshSessionTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return this.refreshTokenService.rotate(refreshToken);
  }

  /**
   * Revokes all refresh tokens belonging to one access-token principal.
   * @param principal - The authenticated principal.
   * @returns The number of revoked sessions.
   */
  logoutAll(principal: RefreshTokenPrincipal): Promise<number> {
    return this.refreshTokenService.revokeAll(principal);
  }
}
