const PRIVATE_REQUIRED_SCOPES = ['openid', 'profile', 'mitid-extra'] as const;
const BUSINESS_REQUIRED_SCOPES = [
  ...PRIVATE_REQUIRED_SCOPES,
  'mitid-business',
] as const;
const MITID_CALLBACK_PATH = '/api/auth/mitid/callback';

type SignicatEnvironment = Record<string, string | undefined>;

type EnabledSignicatConfig = {
  enabled: true;
  issuerUrl: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  privateScopes: readonly string[];
  businessScopes: readonly string[];
  acrValues: 'idp:mitid';
};

export type SignicatConfig = { enabled: false } | EnabledSignicatConfig;

export const SIGNICAT_CONFIG = Symbol('SIGNICAT_CONFIG');

/**
 * Creates validated server-controlled configuration for the Signicat OIDC client.
 * @param environment - Environment values used to configure the OIDC client.
 * @returns The normalized Signicat client configuration.
 * @throws Error when a required value is missing or violates the OIDC contract.
 */
export function createSignicatConfig(
  environment: SignicatEnvironment = process.env,
): SignicatConfig {
  const enabled = optionalBoolean(environment, 'SIGNICAT_ENABLED', false);

  if (!enabled) {
    return { enabled: false };
  }

  const issuerUrl = requiredOidcUrl(
    environment,
    'SIGNICAT_ISSUER_URL',
    false,
  ).replace(/\/$/, '');
  const redirectUri = requiredOidcUrl(
    environment,
    'SIGNICAT_REDIRECT_URI',
    true,
  );
  const parsedRedirectUri = new URL(redirectUri);

  if (parsedRedirectUri.pathname !== MITID_CALLBACK_PATH) {
    throw new Error(
      `SIGNICAT_REDIRECT_URI must use the callback path ${MITID_CALLBACK_PATH}.`,
    );
  }

  return {
    enabled: true,
    issuerUrl,
    discoveryUrl: `${issuerUrl}/.well-known/openid-configuration`,
    clientId: requiredString(environment, 'SIGNICAT_CLIENT_ID'),
    clientSecret: requiredString(environment, 'SIGNICAT_CLIENT_SECRET'),
    redirectUri,
    privateScopes: requiredScopes(
      environment,
      'SIGNICAT_PRIVATE_SCOPES',
      PRIVATE_REQUIRED_SCOPES,
    ),
    businessScopes: requiredScopes(
      environment,
      'SIGNICAT_BUSINESS_SCOPES',
      BUSINESS_REQUIRED_SCOPES,
    ),
    acrValues: 'idp:mitid',
  };
}

/**
 * Reads an optional boolean configuration value.
 * @param environment - Environment values containing the setting.
 * @param name - The setting name.
 * @param fallback - Value used when the setting is absent.
 * @returns The configured or fallback boolean.
 */
function optionalBoolean(
  environment: SignicatEnvironment,
  name: string,
  fallback: boolean,
): boolean {
  const value = environment[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value !== 'true' && value !== 'false') {
    throw new Error(`${name} must be true or false.`);
  }

  return value === 'true';
}

/**
 * Reads one required non-empty configuration value.
 * @param environment - Environment values containing the setting.
 * @param name - The setting name.
 * @returns The trimmed setting value.
 */
function requiredString(
  environment: SignicatEnvironment,
  name: string,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Signicat environment variable: ${name}`);
  }

  return value;
}

/**
 * Reads and validates one absolute OIDC URL without credentials or fragments.
 * @param environment - Environment values containing the setting.
 * @param name - The setting name.
 * @param allowHttpLoopback - Whether HTTP is accepted for a loopback host.
 * @returns The normalized URL.
 */
function requiredOidcUrl(
  environment: SignicatEnvironment,
  name: string,
  allowHttpLoopback: boolean,
): string {
  const value = requiredString(environment, name);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTPS URL.`);
  }

  const usesAllowedProtocol =
    url.protocol === 'https:' ||
    (allowHttpLoopback &&
      url.protocol === 'http:' &&
      isLoopbackHostname(url.hostname));

  if (
    !usesAllowedProtocol ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      `${name} must be an absolute HTTPS URL, or an HTTP loopback URL when supported, without credentials, a query, or a fragment.`,
    );
  }

  return url.toString();
}

/**
 * Identifies loopback hosts allowed by Signicat for local HTTP callbacks.
 * @param hostname - URL hostname to inspect.
 * @returns True for localhost, IPv4 loopback, or IPv6 loopback.
 */
function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  );
}

/**
 * Reads a scope list and verifies that the identity flow's required scopes exist.
 * @param environment - Environment values containing the setting.
 * @param name - The setting name.
 * @param required - Scopes required for this login context.
 * @returns A normalized list without duplicates.
 */
function requiredScopes(
  environment: SignicatEnvironment,
  name: string,
  required: readonly string[],
): readonly string[] {
  const scopes = [
    ...new Set(requiredString(environment, name).split(/\s+/).filter(Boolean)),
  ];
  const missing = required.filter((scope) => !scopes.includes(scope));

  if (missing.length > 0) {
    throw new Error(
      `${name} is missing required scopes: ${missing.join(', ')}.`,
    );
  }

  return scopes;
}
