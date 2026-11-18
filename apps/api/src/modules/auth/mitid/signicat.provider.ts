import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { validate as validateUuid } from 'uuid';
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
  userInfoEndpoint: string;
};

@Injectable()
export class SignicatProvider {
  private discoveryPromise?: Promise<OidcDiscovery>;
  private jwks?: JWTVerifyGetKey;

  /**
   * Creates the Signicat OIDC provider adapter.
   * @param config - The validated, server-controlled Signicat client configuration.
   */
  constructor(
    @Inject(SIGNICAT_CONFIG) private readonly config: SignicatConfig,
  ) {}

  /**
   * Builds an authorization-code redirect from discovery and transaction values.
   * @param request - The login context and fresh state, nonce, and PKCE challenge.
   * @returns The Signicat authorization endpoint URL with server-controlled parameters.
   */
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

  /**
   * Exchanges an authorization code and verifies the resulting Signicat identity.
   * @param code - The authorization code returned by Signicat.
   * @param pkceVerifier - The verifier retained in the consumed transaction.
   * @param expectedNonceHash - The stored hash used to validate the ID-token nonce.
   * @returns A normalized identity without provider tokens or raw claim collections.
   * @throws Error when exchange, signature, claims, nonce, or UserInfo validation fails.
   */
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
    const accessToken = tokenResponse.access_token;

    if (
      !response.ok ||
      typeof idToken !== 'string' ||
      typeof accessToken !== 'string'
    ) {
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

    const userInfo = await this.fetchUserInfo(
      discovery.userInfoEndpoint,
      accessToken,
      payload.sub,
    );
    const mitidUuid = optionalUuidClaim(
      userInfo.mitid_uuid ?? payload.mitid_uuid,
      'mitid_uuid',
    );
    const organisationCvr = optionalCvrClaim(
      userInfo.mitid_organisation_cvr ?? payload.mitid_organisation_cvr,
    );
    const employeeUuid = optionalUuidClaim(
      userInfo.mitid_employee_uuid ?? payload.mitid_employee_uuid,
      'mitid_employee_uuid',
    );

    return {
      issuer: payload.iss,
      subject: payload.sub,
      ...(mitidUuid === undefined ? {} : { mitidUuid }),
      ...(organisationCvr === undefined ? {} : { organisationCvr }),
      ...(employeeUuid === undefined ? {} : { employeeUuid }),
    };
  }

  /**
   * Retrieves scoped identity claims and binds them to the verified ID-token subject.
   * @param endpoint - The discovered HTTPS UserInfo endpoint.
   * @param accessToken - The short-lived provider token used only for this request.
   * @param expectedSubject - The subject from the verified ID token.
   * @returns The UserInfo claim object after subject validation.
   * @throws Error when the response fails or belongs to another subject.
   */
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
      throw new Error('Signicat UserInfo response is invalid.');
    }

    return userInfo;
  }

  /**
   * Narrows the optional provider configuration to its enabled form.
   * @returns The validated enabled Signicat configuration.
   * @throws Error when Signicat authentication is disabled.
   */
  private enabledConfig(): Extract<SignicatConfig, { enabled: true }> {
    if (!this.config.enabled) {
      throw new Error('Signicat is disabled.');
    }

    return this.config;
  }

  /**
   * Selects the server-configured scopes for one applicant login context.
   * @param loginType - The private or business applicant login type.
   * @returns The configured scopes, including business claims when required.
   */
  private scopesFor(loginType: MitidLoginType): readonly string[] {
    const config = this.enabledConfig();
    return loginType === 'PRIVATE_APPLICANT'
      ? config.privateScopes
      : config.businessScopes;
  }

  /**
   * Loads and caches a validated discovery document for the current process.
   * @returns The provider endpoints required by the authorization flow.
   */
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

  /**
   * Fetches Signicat discovery and validates its issuer and HTTPS endpoints.
   * @returns The normalized authorization, token, JWKS, and UserInfo endpoints.
   * @throws Error when discovery is unavailable or does not match configuration.
   */
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
      userInfoEndpoint: requireHttpsUrl(
        document.userinfo_endpoint,
        'UserInfo endpoint',
      ),
    };
  }

  /**
   * Creates the cached remote-key resolver used for ID-token verification.
   * @param discovery - The validated discovery endpoints.
   * @returns A JOSE key resolver backed by Signicat's JWKS endpoint.
   */
  private getJwks(discovery: OidcDiscovery): JWTVerifyGetKey {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(discovery.jwksUri));
    }

    return this.jwks;
  }
}

/**
 * Parses a provider response while requiring a JSON object body.
 * @param response - The discovery, token, or UserInfo HTTP response.
 * @returns The parsed object without assuming a provider-specific shape.
 * @throws Error when the body is not valid JSON or is not an object.
 */
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

/**
 * Validates a provider endpoint before it is used for a server-side request.
 * @param value - The untrusted endpoint value from discovery.
 * @param label - The endpoint name used in a safe validation error.
 * @returns The normalized absolute HTTPS URL.
 * @throws Error when the value is missing, unsafe, or malformed.
 */
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

/**
 * Hashes a nonce using the transaction persistence format.
 * @param value - The raw nonce returned in a verified ID token.
 * @returns The SHA-256 digest as lowercase hexadecimal.
 */
function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Compares fixed-format hashes without value-dependent timing.
 * @param actual - The hash derived from the provider response.
 * @param expected - The hash loaded from the consumed transaction.
 * @returns True when both hashes contain the same bytes.
 */
function hashesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

/**
 * Validates an optional Signicat UUID claim before domain normalization.
 * @param value - The untrusted provider claim value.
 * @param claimName - The claim name used in a safe validation error.
 * @returns The validated UUID, or undefined when the claim is absent.
 * @throws Error when a present claim is not a UUID string.
 */
function optionalUuidClaim(
  value: unknown,
  claimName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !validateUuid(value)) {
    throw new Error(`Signicat ${claimName} claim is invalid.`);
  }

  return value;
}

/**
 * Validates an optional organization CVR from MitID Business.
 * @param value - The untrusted `mitid_organisation_cvr` claim value.
 * @returns The eight-digit CVR, or undefined when the claim is absent.
 * @throws Error when a present claim is not an eight-digit string.
 */
function optionalCvrClaim(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) {
    throw new Error('Signicat mitid_organisation_cvr claim is invalid.');
  }

  return value;
}
