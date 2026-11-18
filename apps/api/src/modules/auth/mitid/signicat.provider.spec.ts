import { createHash, type KeyObject } from 'node:crypto';
import {
  type CryptoKey,
  exportJWK,
  generateKeyPair,
  type JWK,
  SignJWT,
} from 'jose';
import type { SignicatConfig } from '../../../config/signicat.config.js';
import { SignicatProvider } from './signicat.provider.js';

const ISSUER = 'https://tenant.sandbox.signicat.dev/auth/open';
const DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;
const AUTHORIZATION_URL = `${ISSUER}/connect/authorize`;
const TOKEN_URL = `${ISSUER}/connect/token`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;
const USERINFO_URL = `${ISSUER}/connect/userinfo`;

const config: SignicatConfig = {
  enabled: true,
  issuerUrl: ISSUER,
  discoveryUrl: DISCOVERY_URL,
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'https://application.example/api/auth/mitid/callback',
  privateScopes: ['openid', 'profile', 'mitid-extra'],
  businessScopes: ['openid', 'profile', 'mitid-extra', 'mitid-business'],
  acrValues: 'idp:mitid',
};

describe('SignicatProvider', () => {
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

  it('builds server-controlled private and business authorization requests', async () => {
    const fetchMock = discoveryFetch();
    vi.stubGlobal('fetch', fetchMock);
    const provider = new SignicatProvider(config);

    const privateUrl = new URL(
      await provider.createAuthorizationUrl({
        loginType: 'PRIVATE_APPLICANT',
        state: 'state',
        nonce: 'nonce',
        codeChallenge: 'challenge',
      }),
    );
    const businessUrl = new URL(
      await provider.createAuthorizationUrl({
        loginType: 'BUSINESS_APPLICANT',
        state: 'business-state',
        nonce: 'business-nonce',
        codeChallenge: 'business-challenge',
      }),
    );

    expect(privateUrl.origin + privateUrl.pathname).toBe(AUTHORIZATION_URL);
    expect(Object.fromEntries(privateUrl.searchParams)).toMatchObject({
      client_id: 'client-id',
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid profile mitid-extra',
      state: 'state',
      nonce: 'nonce',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      acr_values: 'idp:mitid',
    });
    expect(businessUrl.searchParams.get('scope')).toBe(
      'openid profile mitid-extra mitid-business',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exchanges the code and verifies signature, issuer, audience, expiry, and nonce', async () => {
    const nonce = 'expected-nonce';
    const idToken = await signedIdToken(nonce);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url === DISCOVERY_URL) {
        return jsonResponse(discoveryDocument());
      }
      if (url === TOKEN_URL) {
        return jsonResponse({
          access_token: 'provider-access-token',
          token_type: 'Bearer',
          id_token: idToken,
        });
      }
      if (url === JWKS_URL) {
        return jsonResponse({ keys: [publicJwk] });
      }
      if (url === USERINFO_URL) {
        return jsonResponse({
          sub: 'provider-subject',
          mitid_uuid: 'f5276262-9145-4616-8faf-23e8e683d665',
          mitid_organisation_cvr: '95338926',
          mitid_employee_uuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new SignicatProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex(nonce),
      ),
    ).resolves.toMatchObject({
      issuer: ISSUER,
      subject: 'provider-subject',
      mitidUuid: 'f5276262-9145-4616-8faf-23e8e683d665',
      organisationCvr: '95338926',
      employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
    });

    const tokenRequest = fetchMock.mock.calls.find(
      ([input]) => requestUrl(input) === TOKEN_URL,
    );
    const tokenOptions = tokenRequest?.[1] as RequestInit;
    expect(tokenOptions.headers).toMatchObject({
      authorization: `Basic ${Buffer.from('client-id:client-secret').toString(
        'base64',
      )}`,
    });
    expect(tokenOptions.body?.toString()).toContain(
      'grant_type=authorization_code',
    );
    expect(tokenOptions.body?.toString()).toContain(
      'code_verifier=pkce-verifier',
    );
  });

  it('rejects a signed ID token with the wrong nonce', async () => {
    const idToken = await signedIdToken('returned-nonce');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
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

        throw new Error(`Unexpected request: ${url}`);
      }),
    );
    const provider = new SignicatProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex('different-nonce'),
      ),
    ).rejects.toThrow('Signicat ID token claims are invalid.');
  });

  it('rejects UserInfo data for a different subject', async () => {
    const nonce = 'expected-nonce';
    const idToken = await signedIdToken(nonce);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
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
            sub: 'different-subject',
            mitid_uuid: 'f5276262-9145-4616-8faf-23e8e683d665',
          });
        }

        throw new Error(`Unexpected request: ${url}`);
      }),
    );
    const provider = new SignicatProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex(nonce),
      ),
    ).rejects.toThrow('Signicat UserInfo response is invalid.');
  });

  it('rejects an invalid MitID UUID claim', async () => {
    const nonce = 'expected-nonce';
    const idToken = await signedIdToken(nonce);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
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
            sub: 'provider-subject',
            mitid_uuid: 'not-a-uuid',
          });
        }

        throw new Error(`Unexpected request: ${url}`);
      }),
    );
    const provider = new SignicatProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex(nonce),
      ),
    ).rejects.toThrow('Signicat mitid_uuid claim is invalid.');
  });

  it('rejects an invalid organization CVR claim', async () => {
    const nonce = 'expected-nonce';
    const idToken = await signedIdToken(nonce);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
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
            sub: 'provider-subject',
            mitid_organisation_cvr: 'invalid-cvr',
            mitid_employee_uuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
          });
        }

        throw new Error(`Unexpected request: ${url}`);
      }),
    );
    const provider = new SignicatProvider(config);

    await expect(
      provider.completeAuthorization(
        'authorization-code',
        'pkce-verifier',
        sha256Hex(nonce),
      ),
    ).rejects.toThrow('Signicat mitid_organisation_cvr claim is invalid.');
  });

  function discoveryFetch(): ReturnType<typeof vi.fn> {
    return vi.fn(async () => jsonResponse(discoveryDocument()));
  }

  function discoveryDocument(): Record<string, string> {
    return {
      issuer: ISSUER,
      authorization_endpoint: AUTHORIZATION_URL,
      token_endpoint: TOKEN_URL,
      jwks_uri: JWKS_URL,
      userinfo_endpoint: USERINFO_URL,
    };
  }

  async function signedIdToken(nonce: string): Promise<string> {
    return new SignJWT({ nonce })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(ISSUER)
      .setAudience('client-id')
      .setSubject('provider-subject')
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
