import { createSignicatConfig } from './signicat.config.js';

const validEnvironment = {
  SIGNICAT_ENABLED: 'true',
  SIGNICAT_ISSUER_URL: 'https://example.sandbox.signicat.dev/auth/open/',
  SIGNICAT_CLIENT_ID: 'sandbox-client-id',
  SIGNICAT_CLIENT_SECRET: 'sandbox-client-secret',
  SIGNICAT_REDIRECT_URI: 'https://application.example/api/auth/mitid/callback',
  SIGNICAT_PRIVATE_SCOPES: 'openid profile mitid-extra',
  SIGNICAT_BUSINESS_SCOPES: 'openid profile mitid-extra mitid-business',
};

describe('createSignicatConfig', () => {
  it('normalizes a valid sandbox OIDC client configuration', () => {
    expect(createSignicatConfig(validEnvironment)).toEqual({
      enabled: true,
      issuerUrl: 'https://example.sandbox.signicat.dev/auth/open',
      discoveryUrl:
        'https://example.sandbox.signicat.dev/auth/open/.well-known/openid-configuration',
      clientId: 'sandbox-client-id',
      clientSecret: 'sandbox-client-secret',
      redirectUri: 'https://application.example/api/auth/mitid/callback',
      privateScopes: ['openid', 'profile', 'mitid-extra'],
      businessScopes: ['openid', 'profile', 'mitid-extra', 'mitid-business'],
      acrValues: 'idp:mitid',
    });
  });

  it('remains disabled without requiring provider credentials', () => {
    expect(createSignicatConfig({})).toEqual({ enabled: false });
  });

  it('rejects an invalid enable flag', () => {
    expect(() =>
      createSignicatConfig({ SIGNICAT_ENABLED: 'sometimes' }),
    ).toThrow('SIGNICAT_ENABLED must be true or false.');
  });

  it.each(['SIGNICAT_CLIENT_ID', 'SIGNICAT_CLIENT_SECRET'])(
    'rejects a missing %s',
    (name) => {
      expect(() =>
        createSignicatConfig({ ...validEnvironment, [name]: ' ' }),
      ).toThrow(`Missing required Signicat environment variable: ${name}`);
    },
  );

  it.each(['SIGNICAT_ISSUER_URL', 'SIGNICAT_REDIRECT_URI'])(
    'rejects an insecure %s',
    (name) => {
      expect(() =>
        createSignicatConfig({
          ...validEnvironment,
          [name]: 'http://application.example/api/auth/mitid/callback',
        }),
      ).toThrow(`${name} must be an absolute HTTPS URL`);
    },
  );

  it('allows an HTTP localhost callback for local development', () => {
    expect(
      createSignicatConfig({
        ...validEnvironment,
        SIGNICAT_REDIRECT_URI: 'http://localhost:5173/api/auth/mitid/callback',
      }),
    ).toMatchObject({
      redirectUri: 'http://localhost:5173/api/auth/mitid/callback',
    });
  });

  it('requires the registered API callback path', () => {
    expect(() =>
      createSignicatConfig({
        ...validEnvironment,
        SIGNICAT_REDIRECT_URI: 'https://application.example/wrong/callback',
      }),
    ).toThrow(
      'SIGNICAT_REDIRECT_URI must use the callback path /api/auth/mitid/callback.',
    );
  });

  it('requires identity scopes for private and business applicants', () => {
    expect(() =>
      createSignicatConfig({
        ...validEnvironment,
        SIGNICAT_PRIVATE_SCOPES: 'openid profile',
      }),
    ).toThrow(
      'SIGNICAT_PRIVATE_SCOPES is missing required scopes: mitid-extra.',
    );
    expect(() =>
      createSignicatConfig({
        ...validEnvironment,
        SIGNICAT_BUSINESS_SCOPES: 'openid profile mitid-extra',
      }),
    ).toThrow(
      'SIGNICAT_BUSINESS_SCOPES is missing required scopes: mitid-business.',
    );
  });
});
