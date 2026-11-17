import type { AccessTokenInput } from '../jwt/jwt.types.js';

export type RefreshTokenPrincipal = AccessTokenInput;

export interface RefreshSessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface CreateRefreshTokenInput {
  tokenHash: string;
  principal: RefreshTokenPrincipal;
  expiresAt: Date;
}

export interface RotateRefreshTokenInput {
  tokenHash: string;
  replacementId: string;
  replacementHash: string;
  rotatedAt: Date;
}

export type RefreshTokenRotationResult =
  | {
      status: 'rotated';
      principal: RefreshTokenPrincipal;
      expiresAt: Date;
    }
  | { status: 'invalid' };
