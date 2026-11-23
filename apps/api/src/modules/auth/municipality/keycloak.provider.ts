import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import {
  KEYCLOAK_CONFIG,
  type KeycloakConfig,
} from '../../../config/keycloak.config.js';
import type {
  MunicipalityAuthorizationRequest,
  VerifiedKeycloakIdentity,
} from './municipality.types.js';

type KeycloakDiscovery = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  userInfoEndpoint: string;
};

@Injectable()
export class KeycloakProvider {
  private discoveryPromise?: Promise<KeycloakDiscovery>;
  private jwks?: JWTVerifyGetKey;

  constructor(
    @Inject(KEYCLOAK_CONFIG) private readonly config: KeycloakConfig,
  ) {}

  async createAuthorizationUrl(
    request: MunicipalityAuthorizationRequest,
  ): Promise<string> {
    const config = this.enabledConfig();
    const discovery = await this.getDiscovery();
    const authorizationUrl = new URL(discovery.authorizationEndpoint);

    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: request.state,
      nonce: request.nonce,
      code_challenge: request.codeChallenge,
      code_challenge_method: 'S256',
    }).toString();

    return authorizationUrl.toString();
  }

  async completeAuthorization(
    code: string,
    pkceVerifier: string,
    expectedNonceHash: string,
  ): Promise<VerifiedKeycloakIdentity> {
    const config = this.enabledConfig();
    const discovery = await this.getDiscovery();
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: {
        accept: 'application/json',
        authorization: `Basic ${Buffer.from(
          `${config.clientId}:${config.clientSecret}`,
        ).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        code_verifier: pkceVerifier,
      }),
    });
    const tokenResponse = await readJsonObject(response);
    const idToken = tokenResponse.id_token;
    const accessToken = tokenResponse.access_token;

    if (
      !response.ok ||
      typeof idToken !== 'string' ||
      typeof accessToken !== 'string'
    ) {
      throw new Error('Keycloak token exchange failed.');
    }

    const { payload } = await jwtVerify(idToken, this.getJwks(discovery), {
      issuer: config.issuerUrl,
      audience: config.clientId,
      algorithms: ['RS256'],
      clockTolerance: 5,
    });

    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.iss !== 'string' ||
      typeof payload.nonce !== 'string' ||
      !hashesMatch(hashValue(payload.nonce), expectedNonceHash)
    ) {
      throw new Error('Keycloak ID token claims are invalid.');
    }

    const userInfo = await this.fetchUserInfo(
      discovery.userInfoEndpoint,
      accessToken,
      payload.sub,
    );
    const municipalityClaim = requiredStringClaim(
      userInfo.municipality_id ?? payload.municipality_id,
      'municipality_id',
    );
    const roles = readRealmRoles(userInfo.realm_access ?? payload.realm_access);

    return {
      issuer: payload.iss.replace(/\/$/, ''),
      subject: payload.sub,
      municipalityClaim,
      roles,
    };
  }

  private async fetchUserInfo(
    endpoint: string,
    accessToken: string,
    expectedSubject: string,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
    const userInfo = await readJsonObject(response);

    if (!response.ok || userInfo.sub !== expectedSubject) {
      throw new Error('Keycloak UserInfo response is invalid.');
    }

    return userInfo;
  }

  private enabledConfig(): Extract<KeycloakConfig, { enabled: true }> {
    if (!this.config.enabled) {
      throw new Error('Keycloak authentication is disabled.');
    }

    return this.config;
  }

  private async getDiscovery(): Promise<KeycloakDiscovery> {
    if (!this.discoveryPromise) {
      this.discoveryPromise = this.fetchDiscovery();
    }

    try {
      return await this.discoveryPromise;
    } catch (error) {
      this.discoveryPromise = undefined;
      throw error;
    }
  }

  private async fetchDiscovery(): Promise<KeycloakDiscovery> {
    const config = this.enabledConfig();
    const response = await fetch(config.discoveryUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    const document = await readJsonObject(response);

    if (!response.ok || normalizeIssuer(document.issuer) !== config.issuerUrl) {
      throw new Error('Keycloak discovery document is invalid.');
    }

    return {
      authorizationEndpoint: requireFrontendEndpoint(
        document.authorization_endpoint,
        'authorization endpoint',
        config,
      ),
      tokenEndpoint: toBackchannelEndpoint(
        document.token_endpoint,
        'token endpoint',
        config,
      ),
      jwksUri: toBackchannelEndpoint(
        document.jwks_uri,
        'JWKS endpoint',
        config,
      ),
      userInfoEndpoint: toBackchannelEndpoint(
        document.userinfo_endpoint,
        'UserInfo endpoint',
        config,
      ),
    };
  }

  private getJwks(discovery: KeycloakDiscovery): JWTVerifyGetKey {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(discovery.jwksUri));
    }

    return this.jwks;
  }
}

async function readJsonObject(
  response: Response,
): Promise<Record<string, unknown>> {
  let value: unknown;

  try {
    value = await response.json();
  } catch {
    throw new Error('Identity provider returned invalid JSON.');
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Identity provider returned an invalid document.');
  }

  return value as Record<string, unknown>;
}

function normalizeIssuer(value: unknown): string | undefined {
  return typeof value === 'string' ? value.replace(/\/$/, '') : undefined;
}

function requireFrontendEndpoint(
  value: unknown,
  label: string,
  config: Extract<KeycloakConfig, { enabled: true }>,
): string {
  const endpoint = requiredEndpoint(value, label);
  const issuer = new URL(config.issuerUrl);

  if (
    endpoint.origin !== issuer.origin ||
    !endpoint.pathname.startsWith(`${issuer.pathname}/`)
  ) {
    throw new Error(
      `Keycloak ${label} does not belong to the configured realm.`,
    );
  }

  return endpoint.toString();
}

function toBackchannelEndpoint(
  value: unknown,
  label: string,
  config: Extract<KeycloakConfig, { enabled: true }>,
): string {
  const endpoint = requiredEndpoint(value, label);
  const issuer = new URL(config.issuerUrl);
  const configuredBackchannel = new URL(config.backchannelRealmUrl);
  const basePath = endpoint.pathname.startsWith(`${issuer.pathname}/`)
    ? issuer.pathname
    : configuredBackchannel.pathname;

  if (!endpoint.pathname.startsWith(`${basePath}/`)) {
    throw new Error(
      `Keycloak ${label} does not belong to the configured realm.`,
    );
  }

  const backchannel = new URL(config.backchannelRealmUrl);
  backchannel.pathname = `${backchannel.pathname}${endpoint.pathname.slice(basePath.length)}`;
  backchannel.search = endpoint.search;
  return backchannel.toString();
}

function requiredEndpoint(value: unknown, label: string): URL {
  if (typeof value !== 'string') {
    throw new Error(`Keycloak ${label} is missing.`);
  }

  let endpoint: URL;

  try {
    endpoint = new URL(value);
  } catch {
    throw new Error(`Keycloak ${label} is invalid.`);
  }

  if (
    (endpoint.protocol !== 'https:' && endpoint.protocol !== 'http:') ||
    endpoint.username.length > 0 ||
    endpoint.password.length > 0 ||
    endpoint.hash.length > 0
  ) {
    throw new Error(`Keycloak ${label} is invalid.`);
  }

  return endpoint;
}

function requiredStringClaim(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Keycloak ${name} claim is invalid.`);
  }

  return value.trim();
}

function readRealmRoles(value: unknown): readonly string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [];
  }

  const roles = (value as Record<string, unknown>).roles;

  if (
    !Array.isArray(roles) ||
    !roles.every((role): role is string => typeof role === 'string')
  ) {
    return [];
  }

  return [...new Set(roles)];
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
