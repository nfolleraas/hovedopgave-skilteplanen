import type {
  JwtClaims,
  JwtHeader,
  JwtPayload,
  ValidatedJwtPayload,
} from '../jwt/jwt.types.js';

/**
 * Maps the configured signing algorithm to a JWT header.
 *
 * @param algorithm - The configured JWT signing algorithm.
 * @returns The JWT header written to the compact token.
 */
export function mapJwtHeader(algorithm: string): JwtHeader {
  return {
    alg: algorithm,
    typ: 'JWT',
  };
}

/**
 * Maps internal JWT claims to their standard JWT payload names.
 *
 * @param claims - The validated internal claims to encode.
 * @returns The payload written to the compact token.
 */
export function mapJwtClaimsToPayload(claims: JwtClaims): JwtPayload {
  return {
    iss: claims.issuer,
    aud: claims.audience,
    sub: claims.subject,
    actor: claims.actor,
    tokenUse: claims.tokenUse,
    jti: claims.jwtId,
    iat: claims.issuedAtTime,
    exp: claims.expirationTime,
    ...(claims.pendingRegistrationId === undefined
      ? {}
      : { pendingRegistrationId: claims.pendingRegistrationId }),
    ...(claims.applicantType === undefined
      ? {}
      : { applicantType: claims.applicantType }),
  };
}

/**
 * Maps a validated JWT payload to the internal claim names used by the API.
 *
 * @param payload - The validated payload from a compact token.
 * @returns The internal JWT claims.
 */
export function mapJwtPayloadToClaims(payload: ValidatedJwtPayload): JwtClaims {
  return {
    issuer: payload.iss,
    audience: payload.aud,
    subject: payload.sub,
    actor: payload.actor,
    tokenUse: payload.tokenUse,
    jwtId: payload.jti,
    issuedAtTime: payload.iat,
    expirationTime: payload.exp,
    ...(payload.pendingRegistrationId === undefined
      ? {}
      : { pendingRegistrationId: payload.pendingRegistrationId }),
    ...(payload.applicantType === undefined
      ? {}
      : { applicantType: payload.applicantType }),
  };
}
