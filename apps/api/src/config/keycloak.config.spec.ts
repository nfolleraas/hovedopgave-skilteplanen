import { createKeycloakConfig } from './keycloak.config.js';

const validEnvironment = {
  KEYCLOAK_ENABLED: 'true',
  KEYCLOAK_ISSUER_URL: 'http://localhost:8080/realms/demo-municipality',
  KEYCLOAK_BACKCHANNEL_REALM_URL:
    'http://keycloak:8080/realms/demo-municipality',
  KEYCLOAK_CLIENT_ID: 'municipal-api',
  KEYCLOAK_CLIENT_SECRET: 'test-client-secret',
  KEYCLOAK_REDIRECT_URI: 'http://localhost:5173/api/auth/municipality/callback',
  KEYCLOAK_SCOPES: 'openid profile',
  KEYCLOAK_REQUIRED_ROLE: 'caseworker',
};

describe('createKeycloakConfig', () => {
  it('stays disabled without requiring credentials', () => {
    expect(createKeycloakConfig({})).toEqual({ enabled: false });
  });

  it('separates browser-facing issuer and Compose backchannel URLs', () => {
    expect(createKeycloakConfig(validEnvironment)).toEqual({
      enabled: true,
      issuerUrl: 'http://localhost:8080/realms/demo-municipality',
      discoveryUrl:
        'http://keycloak:8080/realms/demo-municipality/.well-known/openid-configuration',
      backchannelRealmUrl: 'http://keycloak:8080/realms/demo-municipality',
      clientId: 'municipal-api',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:5173/api/auth/municipality/callback',
      scopes: ['openid', 'profile'],
      requiredRole: 'caseworker',
    });
  });

  it('requires the backend callback and core OpenID scopes', () => {
    expect(() =>
      createKeycloakConfig({
        ...validEnvironment,
        KEYCLOAK_REDIRECT_URI: 'http://localhost:5173/wrong',
      }),
    ).toThrow(
      'KEYCLOAK_REDIRECT_URI must use the callback path /api/auth/municipality/callback.',
    );
    expect(() =>
      createKeycloakConfig({
        ...validEnvironment,
        KEYCLOAK_SCOPES: 'openid',
      }),
    ).toThrow('KEYCLOAK_SCOPES is missing required scopes: profile.');
  });

  it('rejects unsafe browser and backchannel URLs', () => {
    expect(() =>
      createKeycloakConfig({
        ...validEnvironment,
        KEYCLOAK_ISSUER_URL: 'http://keycloak:8080/realms/demo-municipality',
      }),
    ).toThrow('KEYCLOAK_ISSUER_URL must be HTTPS');
    expect(() =>
      createKeycloakConfig({
        ...validEnvironment,
        KEYCLOAK_BACKCHANNEL_REALM_URL:
          'http://attacker.example/realms/demo-municipality',
      }),
    ).toThrow('KEYCLOAK_BACKCHANNEL_REALM_URL must be HTTPS');
  });
});
