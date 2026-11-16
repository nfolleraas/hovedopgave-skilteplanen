import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import type {
  AccessTokenInput,
  JwtClaims,
  OnboardingApplicantType,
  OnboardingTokenInput,
  TokenUse,
} from './jwt.types.js';

const AUTH_ACTORS = ['APPLICANT', 'CASE_WORKER', 'ADMINISTRATOR'] as const;
const ONBOARDING_APPLICANT_TYPES = ['Private', 'Business'] as const;
const TOKEN_USES = ['ONBOARDING', 'ACCESS'] as const;

type JwtHeader = {
  alg: string;
  typ: string;
};

type JwtPayload = {
  iss: unknown;
  aud: unknown;
  sub: unknown;
  actor: unknown;
  tokenUse: unknown;
  jti: unknown;
  iat: unknown;
  exp: unknown;
  pendingRegistrationId: unknown;
  applicantType: unknown;
};

/**
 * Encodes a JSON value using base64url without padding.
 * @param value - The JSON-compatible value to encode.
 * @returns The base64url-encoded JSON value.
 */
function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * Decodes a base64url JSON value.
 * @param value - The base64url-encoded JSON value.
 * @returns The decoded JSON value.
 * @throws Error when the value is not valid JSON.
 */
function decodeJson(value: string): unknown {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

/**
 * Determines whether a value is a non-null object.
 * @param value - The value to inspect.
 * @returns True when the value is an object that can contain JWT fields.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Determines whether a value is a supported authentication actor.
 * @param value - The value to inspect.
 * @returns True when the value is a valid authentication actor.
 */
function isAuthActor(value: unknown): value is JwtClaims['actor'] {
  return (
    typeof value === 'string' &&
    (AUTH_ACTORS as readonly string[]).includes(value)
  );
}

/**
 * Determines whether a value is a supported token purpose.
 * @param value - The value to inspect.
 * @returns True when the value is a valid token purpose.
 */
function isTokenUse(value: unknown): value is TokenUse {
  return (
    typeof value === 'string' &&
    (TOKEN_USES as readonly string[]).includes(value)
  );
}

/**
 * Determines whether a value is a supported applicant type for onboarding.
 * @param value - The value to inspect.
 * @returns True when the value identifies a supported applicant type.
 */
function isOnboardingApplicantType(
  value: unknown,
): value is OnboardingApplicantType {
  return (
    typeof value === 'string' &&
    (ONBOARDING_APPLICANT_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Determines whether a value is an integer JWT NumericDate.
 * @param value - The value to inspect.
 * @returns True when the value is a finite integer.
 */
function isNumericDate(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

@Injectable()
export class JwtService {
  /**
   * Creates a JWT service with the validated authentication configuration.
   * @param config - The authentication configuration.
   */
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  /**
   * Signs internal claims as an HS256 JWT with standard wire claim names.
   * @param claims - The validated internal claims to sign.
   * @returns The signed compact JWT.
   * @throws UnauthorizedException when the claims are invalid.
   */
  sign(claims: JwtClaims): string {
    this.validateClaims(claims);

    const header: JwtHeader = {
      alg: this.config.jwt.algorithm,
      typ: 'JWT',
    };
    const payload = {
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
    const encodedHeader = encodeJson(header);
    const encodedPayload = encodeJson(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.signInput(signingInput);

    return `${signingInput}.${signature}`;
  }

  /**
   * Creates a short-lived access token for an authenticated principal.
   * @param input - The principal subject and actor type.
   * @returns A signed access JWT.
   */
  createAccessToken(input: AccessTokenInput): string {
    const { issuedAtTime, expirationTime } = this.createTimestamps(
      this.config.jwt.accessTokenTtlSeconds,
    );

    return this.sign({
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
      subject: input.subject,
      actor: input.actor,
      tokenUse: 'ACCESS',
      jwtId: randomUUID(),
      issuedAtTime,
      expirationTime,
    });
  }

  /**
   * Creates a short-lived onboarding token for a pending applicant.
   * @param input - The pending registration and applicant type.
   * @returns A signed onboarding JWT.
   */
  createOnboardingToken(input: OnboardingTokenInput): string {
    const { issuedAtTime, expirationTime } = this.createTimestamps(
      this.config.jwt.onboardingTokenTtlSeconds,
    );

    return this.sign({
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
      subject: input.pendingRegistrationId,
      actor: 'APPLICANT',
      tokenUse: 'ONBOARDING',
      jwtId: randomUUID(),
      issuedAtTime,
      expirationTime,
      pendingRegistrationId: input.pendingRegistrationId,
      applicantType: input.applicantType,
    });
  }

  /**
   * Verifies a compact HS256 JWT and maps standard claims to internal names.
   * @param token - The compact JWT received from a request.
   * @returns The verified internal claims.
   * @throws UnauthorizedException when the token is malformed or invalid.
   */
  verify(token: string): JwtClaims {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw this.invalidToken();
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    this.parseHeader(encodedHeader);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.signInput(signingInput);

    if (!this.signaturesMatch(encodedSignature, expectedSignature)) {
      throw this.invalidToken();
    }

    const payload = this.parsePayload(encodedPayload);
    const claims = this.toClaims(payload);
    this.validateClaims(claims);

    return claims;
  }

  /**
   * Creates an HS256 signature for a JWT signing input.
   * @param signingInput - The encoded header and payload.
   * @returns The base64url-encoded HMAC signature.
   */
  private signInput(signingInput: string): string {
    return createHmac('sha256', this.config.jwt.secret)
      .update(signingInput)
      .digest('base64url');
  }

  /**
   * Compares two JWT signatures in constant time.
   * @param receivedSignature - The signature supplied with the token.
   * @param expectedSignature - The signature calculated by the service.
   * @returns True when both signatures are equal.
   */
  private signaturesMatch(
    receivedSignature: string,
    expectedSignature: string,
  ): boolean {
    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);

    return (
      received.length === expected.length && timingSafeEqual(received, expected)
    );
  }

  /**
   * Parses and validates the JWT header.
   * @param encodedHeader - The encoded JWT header.
   * @returns The validated JWT header.
   * @throws UnauthorizedException when the header is invalid.
   */
  private parseHeader(encodedHeader: string): JwtHeader {
    try {
      const header = decodeJson(encodedHeader);

      if (
        !isRecord(header) ||
        header.alg !== this.config.jwt.algorithm ||
        header.typ !== 'JWT'
      ) {
        throw new Error('Invalid JWT header.');
      }

      return {
        alg: header.alg,
        typ: header.typ,
      };
    } catch {
      throw this.invalidToken();
    }
  }

  /**
   * Parses the JWT payload into a validated payload shape.
   * @param encodedPayload - The encoded JWT payload.
   * @returns The decoded JWT payload.
   * @throws UnauthorizedException when the payload is not an object.
   */
  private parsePayload(encodedPayload: string): JwtPayload {
    try {
      const payload = decodeJson(encodedPayload);

      if (!isRecord(payload)) {
        throw new Error('Invalid JWT payload.');
      }

      return payload as JwtPayload;
    } catch {
      throw this.invalidToken();
    }
  }

  /**
   * Maps standard JWT claims to the internal claim names used by the API.
   * @param payload - The decoded JWT payload.
   * @returns The internal authentication claims.
   * @throws UnauthorizedException when required claims have invalid types.
   */
  private toClaims(payload: JwtPayload): JwtClaims {
    const pendingRegistrationId = payload.pendingRegistrationId;
    const applicantType = payload.applicantType;
    let validatedPendingRegistrationId: string | undefined;
    let validatedApplicantType: OnboardingApplicantType | undefined;

    if (
      typeof payload.iss !== 'string' ||
      typeof payload.aud !== 'string' ||
      typeof payload.sub !== 'string' ||
      !isAuthActor(payload.actor) ||
      !isTokenUse(payload.tokenUse) ||
      typeof payload.jti !== 'string' ||
      !isNumericDate(payload.iat) ||
      !isNumericDate(payload.exp)
    ) {
      throw this.invalidToken();
    }

    if (pendingRegistrationId !== undefined) {
      if (typeof pendingRegistrationId !== 'string') {
        throw this.invalidToken();
      }

      validatedPendingRegistrationId = pendingRegistrationId;
    }

    if (applicantType !== undefined) {
      if (!isOnboardingApplicantType(applicantType)) {
        throw this.invalidToken();
      }

      validatedApplicantType = applicantType;
    }

    return {
      issuer: payload.iss,
      audience: payload.aud,
      subject: payload.sub,
      actor: payload.actor,
      tokenUse: payload.tokenUse,
      jwtId: payload.jti,
      issuedAtTime: payload.iat,
      expirationTime: payload.exp,
      ...(validatedPendingRegistrationId === undefined
        ? {}
        : { pendingRegistrationId: validatedPendingRegistrationId }),
      ...(validatedApplicantType === undefined
        ? {}
        : { applicantType: validatedApplicantType }),
    };
  }

  /**
   * Validates claim values against the configured token contract.
   * @param claims - The internal claims to validate.
   * @throws UnauthorizedException when the claims are invalid or expired.
   */
  private validateClaims(claims: JwtClaims): void {
    const now = Math.floor(Date.now() / 1_000);

    if (
      claims.issuer !== this.config.jwt.issuer ||
      claims.audience !== this.config.jwt.audience ||
      claims.subject.length === 0 ||
      claims.jwtId.length === 0 ||
      claims.issuedAtTime > now + 60 ||
      claims.expirationTime <= now ||
      claims.issuedAtTime >= claims.expirationTime
    ) {
      throw this.invalidToken();
    }

    const hasOnboardingClaims =
      claims.pendingRegistrationId !== undefined ||
      claims.applicantType !== undefined;

    if (claims.tokenUse === 'ONBOARDING') {
      if (
        claims.actor !== 'APPLICANT' ||
        claims.pendingRegistrationId === undefined ||
        claims.pendingRegistrationId.length === 0 ||
        !isOnboardingApplicantType(claims.applicantType)
      ) {
        throw this.invalidToken();
      }
    } else if (hasOnboardingClaims) {
      throw this.invalidToken();
    }
  }

  /**
   * Creates issued-at and expiration timestamps for a token lifetime.
   * @param lifetimeSeconds - The configured lifetime in seconds.
   * @returns The timestamps to include in a JWT.
   */
  private createTimestamps(lifetimeSeconds: number): {
    issuedAtTime: number;
    expirationTime: number;
  } {
    const issuedAtTime = Math.floor(Date.now() / 1_000);

    return {
      issuedAtTime,
      expirationTime: issuedAtTime + lifetimeSeconds,
    };
  }

  /**
   * Creates a safe authentication error without exposing token details.
   * @returns An unauthorized exception for invalid JWT input.
   */
  private invalidToken(): UnauthorizedException {
    return new UnauthorizedException('Invalid access token.');
  }
}
