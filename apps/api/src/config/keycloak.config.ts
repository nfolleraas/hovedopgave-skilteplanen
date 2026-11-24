const MUNICIPALITY_CALLBACK_PATH = '/api/auth/municipality/callback';
const REQUIRED_SCOPES = ['openid', 'profile'] as const;

type KeycloakEnvironment = Record<string, string | undefined>;

type EnabledKeycloakConfig = {
  enabled: true;
  issuerUrl: string;
  discoveryUrl: string;
  backchannelRealmUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: readonly string[];
  requiredRole: string;
};

export type KeycloakConfig = { enabled: false } | EnabledKeycloakConfig;

export const KEYCLOAK_CONFIG = Symbol('KEYCLOAK_CONFIG');

/**
 * Creates validated server-controlled configuration for municipal Keycloak OIDC.
 * @param environment - Environment values used to configure Keycloak.
 * @returns Disabled configuration or a normalized enabled configuration.
 * @throws Error when an enabled setting is missing or unsafe.
 */
export function createKeycloakConfig(
  environment: KeycloakEnvironment = process.env,
): KeycloakConfig {
  const enabled = optionalBoolean(environment, 'KEYCLOAK_ENABLED', false);

  if (!enabled) {
    return { enabled: false };
  }

  const issuerUrl = requiredUrl(
    environment,
    'KEYCLOAK_ISSUER_URL',
    true,
  ).replace(/\/$/, '');
  const backchannelRealmUrl = requiredUrl(
    environment,
    'KEYCLOAK_BACKCHANNEL_REALM_URL',
    false,
  ).replace(/\/$/, '');
  const redirectUri = requiredUrl(environment, 'KEYCLOAK_REDIRECT_URI', true);

  if (new URL(redirectUri).pathname !== MUNICIPALITY_CALLBACK_PATH) {
    throw new Error(
      `KEYCLOAK_REDIRECT_URI must use the callback path ${MUNICIPALITY_CALLBACK_PATH}.`,
    );
  }

  if (
    realmName(issuerUrl) === undefined ||
    realmName(issuerUrl) !== realmName(backchannelRealmUrl)
  ) {
    throw new Error(
      'Keycloak issuer and backchannel URLs must identify the same realm.',
    );
  }

  return {
    enabled: true,
    issuerUrl,
    discoveryUrl: `${backchannelRealmUrl}/.well-known/openid-configuration`,
    backchannelRealmUrl,
    clientId: requiredString(environment, 'KEYCLOAK_CLIENT_ID'),
    clientSecret: requiredString(environment, 'KEYCLOAK_CLIENT_SECRET'),
    redirectUri,
    scopes: requiredScopes(environment, 'KEYCLOAK_SCOPES'),
    requiredRole: requiredString(environment, 'KEYCLOAK_REQUIRED_ROLE'),
  };
}

function realmName(value: string): string | undefined {
  const match = new URL(value).pathname.match(/^\/realms\/([^/]+)$/);
  return match?.[1];
}

function optionalBoolean(
  environment: KeycloakEnvironment,
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

function requiredString(
  environment: KeycloakEnvironment,
  name: string,
): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`Missing required Keycloak environment variable: ${name}`);
  }

  return value;
}

function requiredScopes(
  environment: KeycloakEnvironment,
  name: string,
): readonly string[] {
  const scopes = [
    ...new Set(requiredString(environment, name).split(/\s+/).filter(Boolean)),
  ];
  const missing = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope));

  if (missing.length > 0) {
    throw new Error(
      `${name} is missing required scopes: ${missing.join(', ')}.`,
    );
  }

  return scopes;
}

function requiredUrl(
  environment: KeycloakEnvironment,
  name: string,
  browserFacing: boolean,
): string {
  const value = requiredString(environment, name);
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }

  const loopback =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]';
  const privateComposeHost = !browserFacing && url.hostname === 'keycloak';

  if (
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && (loopback || privateComposeHost))) ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(
      `${name} must be HTTPS, except for local development URLs, and must not contain credentials, a query, or a fragment.`,
    );
  }

  return url.toString();
}
