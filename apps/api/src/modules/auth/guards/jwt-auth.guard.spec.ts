import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthConfig } from '../../../config/auth.config.js';
import type { AuthenticatedRequest } from '../auth-request.types.js';
import type { JwtService } from '../jwt/jwt.service.js';
import type { JwtClaims } from '../jwt/jwt.types.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

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
  process.env.AUTH_REFRESH_COOKIE_PATH = '/api/auth/refresh';
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
    refreshPath: '/api/auth/refresh',
    secure: false,
    sameSite: 'lax',
  },
};

const accessClaims: JwtClaims = {
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  subject: 'applicant-123',
  actor: 'APPLICANT',
  tokenUse: 'ACCESS',
  jwtId: 'jwt-123',
  issuedAtTime: 1_795_000_000,
  expirationTime: 1_795_000_600,
};

/**
 * Creates an HTTP execution context with an optional Cookie header.
 * @param cookie - The raw Cookie header supplied to the guard.
 * @returns The execution context and request used by the test.
 */
function createContext(cookie?: string): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const request = {
    headers: { ...(cookie === undefined ? {} : { cookie }) },
  } as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verify: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtService = { verify: vi.fn() };
    guard = new JwtAuthGuard(jwtService as unknown as JwtService, config);
  });

  it('accepts a valid access-token cookie and attaches its claims', () => {
    jwtService.verify.mockReturnValue(accessClaims);
    const { context, request } = createContext(
      'theme=dark; sk_access=signed%2Ejwt%2Etoken; locale=da',
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('signed.jwt.token');
    expect(request.auth).toEqual(accessClaims);
  });

  it('denies a request without the access-token cookie', () => {
    const { context } = createContext('theme=dark');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('denies a valid onboarding token on a normal route', () => {
    jwtService.verify.mockReturnValue({
      ...accessClaims,
      subject: 'pending-123',
      tokenUse: 'ONBOARDING',
      pendingRegistrationId: 'pending-123',
      applicantType: 'Private',
    });
    const { context } = createContext('sk_access=onboarding-token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('denies a malformed cookie value before JWT validation', () => {
    const { context } = createContext('sk_access=%E0%A4%A');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('propagates JWT validation failures', () => {
    jwtService.verify.mockImplementation(() => {
      throw new UnauthorizedException('Invalid access token.');
    });
    const { context } = createContext('sk_access=invalid-token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
