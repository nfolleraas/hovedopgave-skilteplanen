import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import {
  SIGNICAT_CONFIG,
  type SignicatConfig,
} from '../../../config/signicat.config.js';
import type {
  MitidLoginType,
  OidcAuthorizationRequest,
  VerifiedOidcIdentity,
} from './mitid.types.js';

type OidcDiscovery = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
};

@Injectable()
export class SignicatProvider {
  private discoveryPromise?: Promise<OidcDiscovery>;
  private jwks?: JWTVerifyGetKey;

  constructor(
    @Inject(SIGNICAT_CONFIG) private readonly config: SignicatConfig,
  ) {}

  async createAuthorizationUrl(
    request: OidcAuthorizationRequest,
  ): Promise<string> {
    const config = this.enabledConfig();
    const discovery = await this.getDiscovery();
    const authorizationUrl = new URL(discovery.authorizationEndpoint);

    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: this.scopesFor(request.loginType).join(' '),
      state: request.state,
      nonce: request.nonce,
      code_challenge: request.codeChallenge,
      code_challenge_method: 'S256',
      acr_values: config.acrValues,
    }).toString();

    return authorizationUrl.toString();
  }

  async completeAuthorization(
    code: string,
    pkceVerifier: string,
    expectedNonceHash: string,
  ): Promise<VerifiedOidcIdentity> {
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

    if (!response.ok || typeof idToken !== 'string') {
      throw new Error('Signicat token exchange failed.');
    }

    const { payload } = await jwtVerify(idToken, this.getJwks(discovery), {
      issuer: config.issuerUrl,
      audience: config.clientId,
      algorithms: ['RS256'],
      clockTolerance: 5,
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.iss !== 'string' ||
      typeof payload.nonce !== 'string' ||
      !hashesMatch(hashValue(payload.nonce), expectedNonceHash)
    ) {
      throw new Error('Signicat ID token claims are invalid.');
    }

    return {
      issuer: payload.iss,
      subject: payload.sub,
      claims: payload,
    };
  }

  private enabledConfig(): Extract<SignicatConfig, { enabled: true }> {
    if (!this.config.enabled) {
      throw new Error('Signicat is disabled.');
    }

    return this.config;
  }

  private scopesFor(loginType: MitidLoginType): readonly string[] {
    const config = this.enabledConfig();
    return loginType === 'PRIVATE_APPLICANT'
      ? config.privateScopes
      : config.businessScopes;
  }

  private async getDiscovery(): Promise<OidcDiscovery> {
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

  private async fetchDiscovery(): Promise<OidcDiscovery> {
    const config = this.enabledConfig();
    const response = await fetch(config.discoveryUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    const document = await readJsonObject(response);

    if (!response.ok || document.issuer !== config.issuerUrl) {
      throw new Error('Signicat discovery document is invalid.');
    }

    return {
      authorizationEndpoint: requireHttpsUrl(
        document.authorization_endpoint,
        'authorization endpoint',
      ),
      tokenEndpoint: requireHttpsUrl(document.token_endpoint, 'token endpoint'),
      jwksUri: requireHttpsUrl(document.jwks_uri, 'JWKS endpoint'),
    };
  }

  private getJwks(discovery: OidcDiscovery): JWTVerifyGetKey {
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

function requireHttpsUrl(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Signicat ${label} is missing.`);
  }

  const url = new URL(value);

  if (
    url.protocol !== 'https:' ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error(`Signicat ${label} must be an HTTPS URL.`);
  }

  return url.toString();
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
