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

/**
 * Reads and trims a required environment variable.
 * @param name - The environment variable name.
 * @returns The non-empty environment variable value.
 * @throws Error when the variable is missing or empty.
 */
function requiredString(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required authentication environment variable: ${name}`,
    );
  }

  return value;
}

/**
 * Reads a required positive integer environment variable.
 * @param name - The environment variable name.
 * @returns The parsed positive integer.
 * @throws Error when the value is not a positive integer.
 */
function requiredPositiveInteger(name: string): number {
  const value = Number(requiredString(name));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Authentication environment variable ${name} must be a positive integer.`,
    );
  }

  return value;
}

/**
 * Reads a required boolean environment variable.
 * @param name - The environment variable name.
 * @returns The parsed boolean value.
 * @throws Error when the value is not true or false.
 */
function requiredBoolean(name: string): boolean {
  const value = requiredString(name).toLowerCase();

  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `Authentication environment variable ${name} must be true or false.`,
    );
  }

  return value === 'true';
}

/**
 * Builds the validated authentication configuration from the environment.
 * @returns The authentication configuration used by the API.
 * @throws Error when a required setting is missing or invalid.
 */
function createAuthConfig(): AuthConfig {
  const secret = requiredString('AUTH_JWT_SECRET');

  if (secret.length < AUTH_SECRET_MIN_LENGTH) {
    throw new Error(
      `AUTH_JWT_SECRET must be at least ${AUTH_SECRET_MIN_LENGTH} ` +
        'characters long.',
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
