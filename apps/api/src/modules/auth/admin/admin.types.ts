import type { RefreshSessionTokens } from '../refresh-token/refresh-token.types.js';

export interface AdminLoginInput {
  email: unknown;
  password: unknown;
  ipAddress?: string;
}

export type AdminLoginSession = RefreshSessionTokens;
