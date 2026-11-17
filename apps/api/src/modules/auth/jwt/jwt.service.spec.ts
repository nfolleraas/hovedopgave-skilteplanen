import { UnauthorizedException } from '@nestjs/common';
import type { AuthConfig } from '../../../config/auth.config.js';
import { JwtService } from './jwt.service.js';
import type { JwtClaims } from './jwt.types.js';

vi.hoisted(() => {
  process.env.AUTH_JWT_SECRET = 'test-secret-with-at-least-32-characters';
  process.env.AUTH_JWT_ISSUER = 'ansoegningsplatformen-api';
  process.env.AUTH_JWT_AUDIENCE = 'ansoegningsplatformen-web';
  process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '600';
  process.env.AUTH_ONBOARDING_TOKEN_TTL_SECONDS = '900';
  process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = '604800';
  process.env.AUTH_ACCESS_COOKIE_NAME = 'sk_access';
  process.env.AUTH_REFRESH_COOKIE_NAME = 'sk_refresh';
  process.env.AUTH_ACCESS_COOKIE_PATH = '/api';
  process.env.AUTH_REFRESH_COOKIE_PATH = '/api/auth';
  process.env.AUTH_COOKIE_SECURE = 'false';
});

const config: AuthConfig = {
  jwt: {
    algorithm: 'HS256',
    secret: 'test-secret-with-at-least-32-characters',
    issuer: 'ansoegningsplatformen-api',
    audience: 'ansoegningsplatformen-web',
    accessTokenTtlSeconds: 600,
    onboardingTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
  },
  cookies: {
    accessName: 'sk_access',
    refreshName: 'sk_refresh',
    accessPath: '/api',
    refreshPath: '/api/auth',
    secure: false,
    sameSite: 'lax',
  },
};

/**
 * Creates a valid access-token claim set for a test.
 * @returns A valid set of internal JWT claims.
 */
function createClaims(): JwtClaims {
  const issuedAtTime = Math.floor(Date.now() / 1_000);

  return {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    subject: 'applicant-123',
    actor: 'APPLICANT',
    tokenUse: 'ACCESS',
    jwtId: 'jwt-123',
    issuedAtTime,
    expirationTime: issuedAtTime + config.jwt.accessTokenTtlSeconds,
  };
}

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    service = new JwtService(config);
  });

  it('signs standard JWT claims and verifies them as internal claims', () => {
    const claims = createClaims();
    const token = service.sign(claims);
    const [encodedHeader, encodedPayload] = token.split('.');
    const header = JSON.parse(
      Buffer.from(encodedHeader, 'base64url').toString('utf8'),
    );
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    );

    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(payload).toMatchObject({
      iss: claims.issuer,
      aud: claims.audience,
      sub: claims.subject,
      jti: claims.jwtId,
      iat: claims.issuedAtTime,
      exp: claims.expirationTime,
    });
    expect(service.verify(token)).toEqual(claims);
  });

  it('creates an access token with the configured access lifetime', () => {
    const token = service.createAccessToken({
      subject: 'case-worker-123',
      actor: 'CASE_WORKER',
    });
    const claims = service.verify(token);

    expect(claims).toMatchObject({
      subject: 'case-worker-123',
      actor: 'CASE_WORKER',
      tokenUse: 'ACCESS',
    });
    expect(claims.expirationTime - claims.issuedAtTime).toBe(600);
    expect(claims.pendingRegistrationId).toBeUndefined();
  });

  it('creates an onboarding token with registration claims and lifetime', () => {
    const token = service.createOnboardingToken({
      pendingRegistrationId: 'pending-123',
      applicantType: 'Business',
    });
    const claims = service.verify(token);

    expect(claims).toMatchObject({
      subject: 'pending-123',
      actor: 'APPLICANT',
      tokenUse: 'ONBOARDING',
      pendingRegistrationId: 'pending-123',
      applicantType: 'Business',
    });
    expect(claims.expirationTime - claims.issuedAtTime).toBe(900);
  });

  it('rejects onboarding claims used with an access token purpose', () => {
    const claims = {
      ...createClaims(),
      pendingRegistrationId: 'pending-123',
      applicantType: 'Private' as const,
    };

    expect(() => service.sign(claims)).toThrow(UnauthorizedException);
  });

  it('rejects a token with a modified payload', () => {
    const token = service.sign(createClaims());
    const [encodedHeader, , signature] = token.split('.');
    const modifiedPayload = Buffer.from(
      JSON.stringify({ subject: 'different-user' }),
    ).toString('base64url');

    expect(() =>
      service.verify(`${encodedHeader}.${modifiedPayload}.${signature}`),
    ).toThrow(UnauthorizedException);
  });

  it('rejects claims with a different audience', () => {
    const claims = createClaims();
    const token = new JwtService({
      ...config,
      jwt: { ...config.jwt, audience: 'different-audience' },
    }).sign({ ...claims, audience: 'different-audience' });

    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects expired claims before signing', () => {
    const now = Math.floor(Date.now() / 1_000);
    const claims = { ...createClaims(), expirationTime: now - 1 };

    expect(() => service.sign(claims)).toThrow(UnauthorizedException);
  });
});
