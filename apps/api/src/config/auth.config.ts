const AUTH_SECRET_MIN_LENGTH = 32;

export type AuthConfig = {
  jwt: {
    algorithm: 'HS256';
    secret: string;
    issuer: string;
    audience: string;
    accessTokenTtlSeconds: number;
    onboardingTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
  };
  cookies: {
    accessName: string;
    refreshName: string;
    accessPath: string;
    refreshPath: string;
    secure: boolean;
    sameSite: 'lax';
  };
};

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

function requiredString(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required authentication environment variable: ${name}`,
    );
  }

  return value;
}

function requiredPositiveInteger(name: string): number {
  const value = Number(requiredString(name));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Authentication environment variable ${name} must be a positive integer.`,
    );
  }

  return value;
}

function requiredBoolean(name: string): boolean {
  const value = requiredString(name).toLowerCase();

  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `Authentication environment variable ${name} must be true or false.`,
    );
  }

  return value === 'true';
}

function createAuthConfig(): AuthConfig {
  const secret = requiredString('AUTH_JWT_SECRET');

  if (secret.length < AUTH_SECRET_MIN_LENGTH) {
    throw new Error(
      `AUTH_JWT_SECRET must be at least ${AUTH_SECRET_MIN_LENGTH} characters long.`,
    );
  }

  return {
    jwt: {
      algorithm: 'HS256',
      secret,
      issuer: requiredString('AUTH_JWT_ISSUER'),
      audience: requiredString('AUTH_JWT_AUDIENCE'),
      accessTokenTtlSeconds: requiredPositiveInteger(
        'AUTH_ACCESS_TOKEN_TTL_SECONDS',
      ),
      onboardingTokenTtlSeconds: requiredPositiveInteger(
        'AUTH_ONBOARDING_TOKEN_TTL_SECONDS',
      ),
      refreshTokenTtlSeconds: requiredPositiveInteger(
        'AUTH_REFRESH_TOKEN_TTL_SECONDS',
      ),
    },
    cookies: {
      accessName: requiredString('AUTH_ACCESS_COOKIE_NAME'),
      refreshName: requiredString('AUTH_REFRESH_COOKIE_NAME'),
      accessPath: requiredString('AUTH_ACCESS_COOKIE_PATH'),
      refreshPath: requiredString('AUTH_REFRESH_COOKIE_PATH'),
      secure: requiredBoolean('AUTH_COOKIE_SECURE'),
      sameSite: 'lax',
    },
  };
}

export const authConfig = createAuthConfig();
