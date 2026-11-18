import type { Request } from 'express';
import type { JwtClaims } from './jwt/jwt.types.js';

export interface AuthenticatedRequest extends Request {
  auth?: JwtClaims;
}
