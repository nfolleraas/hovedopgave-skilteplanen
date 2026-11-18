import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import { JwtService } from '../jwt/jwt.service.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import type {
  RefreshSessionTokens,
  RefreshTokenPrincipal,
} from './refresh-token.types.js';

const REFRESH_TOKEN_BYTE_LENGTH = 32;

@Injectable()
export class RefreshTokenService {
  /**
   * Creates a refresh-token service using the authentication persistence and
   * validated token configuration.
   * @param repository - The repository used for token persistence.
   * @param jwtService - The service used to issue replacement access tokens.
   * @param config - The validated authentication configuration.
   */
  constructor(
    private readonly repository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  /**
   * Issues an access token and a stored, hashed refresh token for an eligible
   * principal.
   * @param principal - The authenticated application principal.
   * @returns The raw tokens and refresh-token expiry returned to the caller.
   * @throws UnauthorizedException when the principal no longer exists or is
   * inactive.
   */
  async issue(principal: RefreshTokenPrincipal): Promise<RefreshSessionTokens> {
    const refreshToken = this.generateToken();
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.createExpiry();

    const created = await this.repository.create({
      tokenHash,
      principal,
      expiresAt,
    });

    if (!created) {
      throw this.invalidRefreshToken();
    }

    return {
      accessToken: this.jwtService.createAccessToken(principal),
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  /**
   * Rotates a valid refresh token exactly once and issues a replacement access
   * token.
   * @param refreshToken - The opaque refresh token supplied by the caller.
   * @returns A replacement access token and refresh token.
   * @throws UnauthorizedException when the token is unknown, expired, revoked,
   * reused, or belongs to an unavailable principal.
   */
  async rotate(refreshToken: string): Promise<RefreshSessionTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const replacementToken = this.generateToken();
    const replacementHash = this.hashToken(replacementToken);
    const replacementId = randomUUID();
    const now = new Date();

    const outcome = await this.repository.rotate({
      tokenHash,
      replacementId,
      replacementHash,
      rotatedAt: now,
    });

    if (outcome.status === 'invalid') {
      throw this.invalidRefreshToken();
    }

    return {
      accessToken: this.jwtService.createAccessToken(outcome.principal),
      refreshToken: replacementToken,
      refreshTokenExpiresAt: outcome.expiresAt,
    };
  }

  /**
   * Revokes one refresh token without revealing whether it existed.
   * @param refreshToken - The opaque refresh token supplied by the caller.
   */
  async revoke(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();

    await this.repository.revoke(tokenHash, now);
  }

  /**
   * Revokes every active refresh token for one principal.
   * @param principal - The principal whose sessions should be revoked.
   * @returns The number of tokens newly revoked.
   */
  async revokeAll(principal: RefreshTokenPrincipal): Promise<number> {
    const now = new Date();

    return this.repository.revokeAll(principal, now);
  }

  /**
   * Creates a cryptographically random opaque refresh token.
   * @returns A base64url-encoded 256-bit token.
   */
  private generateToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('base64url');
  }

  /**
   * Hashes a refresh token before persistence or lookup.
   * @param refreshToken - The opaque refresh token.
   * @returns The SHA-256 token hash as lowercase hexadecimal.
   */
  private hashToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  /**
   * Calculates the absolute expiry for a newly issued refresh token.
   * @returns The configured refresh-token expiry time.
   */
  private createExpiry(): Date {
    return new Date(
      Date.now() + this.config.jwt.refreshTokenTtlSeconds * 1_000,
    );
  }

  /**
   * Creates a generic authentication error that does not expose token state.
   * @returns An unauthorized exception for an invalid refresh token.
   */
  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException('Invalid refresh token.');
  }
}
