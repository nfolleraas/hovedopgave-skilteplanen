import type { JwtClaims } from './jwt/jwt.types.js';

export interface CurrentAuthSession {
  subject: string;
  actor: JwtClaims['actor'];
  tokenUse: JwtClaims['tokenUse'];
}
