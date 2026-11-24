import { createHash, type KeyObject } from 'node:crypto';
import {
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWK,
  SignJWT,
} from 'jose';
import type { KeycloakConfig } from '../../../config/keycloak.config.js';
import { KeycloakProvider } from './keycloak.provider.js';

const ISSUER = 'http://localhost:8080/realms/demo-municipality';
const BACKCHANNEL = 'http://keycloak:8080/realms/demo-municipality';
const DISCOVERY_URL = `${BACKCHANNEL}/.well-known/openid-configuration`;
const AUTHORIZATION_URL = `${ISSUER}/protocol/openid-connect/auth`;
const TOKEN_URL = `${BACKCHANNEL}/protocol/openid-connect/token`;
const JWKS_URL = `${BACKCHANNEL}/protocol/openid-connect/certs`;
const USERINFO_URL = `${BACKCHANNEL}/protocol/openid-connect/userinfo`;

const config: KeycloakConfig = {
  enabled: true,
  issuerUrl: ISSUER,
  discoveryUrl: DISCOVERY_URL,
  backchannelRealmUrl: BACKCHANNEL,
  clientId: 'municipal-api',
  clientSecret: 'client-secret',
  redirectUri: 'http://localhost:5173/api/auth/municipality/callback',
  scopes: ['openid', 'profile'],
  requiredRole: 'caseworker',
};

describe('KeycloakProvider', () => {
  let privateKey: CryptoKey | KeyObject;
  let publicJwk: JWK;

  beforeEach(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true });
    privateKey = keyPair.privateKey;
    publicJwk = {
      ...(await exportJWK(keyPair.publicKey)),
      alg: 'RS256',
      kid: 'test-key',
      use: 'sig',
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a browser authorization URL from server-controlled settings', async () => {
    vi.stubGlobal('fetch', discoveryFetch());
    const provider = new KeycloakProvider(config);
    const url = new URL(
      await provider.createAuthorizationUrl({
        state: 'state',
        nonce: 'nonce',
        codeChallenge: 'challenge',
      }),
    );

    expect(url.origin + url.pathname).toBe(AUTHORIZATION_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'municipal-api',
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: 'state',
      nonce: 'nonce',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
    });
  });

  it('uses backchannel endpoints and returns normalized verified claims', async () => {
    const nonce = 'expected-nonce';
    const fetchMock = providerFetch(await signedIdToken(nonce));
    vi.stubGlobal('fetch', fetchMock);
    const provider = new KeycloakProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex(nonce),
      ),
    ).resolves.toEqual({
      issuer: ISSUER,
      subject: 'keycloak-user-id',
      municipalityClaim: 'demo-kommune',
      roles: ['municipal-employee', 'caseworker'],
    });

    const requestedUrls = fetchMock.mock.calls.map(([input]) =>
      requestUrl(input),
    );
    expect(requestedUrls).toEqual(
      expect.arrayContaining([
        DISCOVERY_URL,
        TOKEN_URL,
        JWKS_URL,
        USERINFO_URL,
      ]),
    );
    const tokenRequest = fetchMock.mock.calls.find(
      ([input]) => requestUrl(input) === TOKEN_URL,
    );
    expect(tokenRequest?.[1]?.headers).toMatchObject({
      authorization: `Basic ${Buffer.from(
        'municipal-api:client-secret',
      ).toString('base64')}`,
    });
    expect(tokenRequest?.[1]?.body?.toString()).toContain(
      'code_verifier=pkce-verifier',
    );
  });

  it('rejects a signed token with the wrong nonce', async () => {
    vi.stubGlobal('fetch', providerFetch(await signedIdToken('wrong-nonce')));
    const provider = new KeycloakProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex('expected-nonce'),
      ),
    ).rejects.toThrow('Keycloak ID token claims are invalid.');
  });

  it('rejects UserInfo belonging to another subject', async () => {
    const nonce = 'expected-nonce';
    const fetchMock = providerFetch(await signedIdToken(nonce), 'other-user');
    vi.stubGlobal('fetch', fetchMock);
    const provider = new KeycloakProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex(nonce),
      ),
    ).rejects.toThrow('Keycloak UserInfo response is invalid.');
  });

  function discoveryFetch(): ReturnType<typeof vi.fn> {
    return vi.fn(async () => jsonResponse(discoveryDocument()));
  }

  function providerFetch(
    idToken: string,
    userInfoSubject = 'keycloak-user-id',
  ): ReturnType<typeof vi.fn> {
    return vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url === DISCOVERY_URL) {
        return jsonResponse(discoveryDocument());
      }
      if (url === TOKEN_URL) {
        return jsonResponse({
          access_token: 'provider-access-token',
          id_token: idToken,
        });
      }
      if (url === JWKS_URL) {
        return jsonResponse({ keys: [publicJwk] });
      }
      if (url === USERINFO_URL) {
        return jsonResponse({
          sub: userInfoSubject,
          municipality_id: 'demo-kommune',
          realm_access: {
            roles: ['municipal-employee', 'caseworker'],
          },
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
  }

  function discoveryDocument(): Record<string, string> {
    return {
      issuer: ISSUER,
      authorization_endpoint: AUTHORIZATION_URL,
      token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
      jwks_uri: `${ISSUER}/protocol/openid-connect/certs`,
      userinfo_endpoint: `${ISSUER}/protocol/openid-connect/userinfo`,
    };
  }

  function signedIdToken(nonce: string): Promise<string> {
    return new SignJWT({ nonce })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience('municipal-api')
      .setSubject('keycloak-user-id')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }
});

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  return input instanceof Request ? input.url : input.toString();
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
