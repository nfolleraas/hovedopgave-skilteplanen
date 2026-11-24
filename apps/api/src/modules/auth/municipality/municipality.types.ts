import type { RefreshSessionTokens } from '../refresh-token/refresh-token.types.js';

export type MunicipalityOidcCallbackInput = {
  state: unknown;
  code: unknown;
  error: unknown;
};

export type MunicipalityAuthorizationRequest = {
  state: string;
  nonce: string;
  codeChallenge: string;
};

export type VerifiedKeycloakIdentity = {
  issuer: string;
  subject: string;
  municipalityClaim: string;
  roles: readonly string[];
};

export type CompletedMunicipalityAuthentication = {
  loginType: 'MUNICIPALITY';
  returnPath: string | null;
  status: 'authenticated';
  session: RefreshSessionTokens;
};

export type CreatedMunicipalityAuthTransaction = {
  state: string;
  nonce: string;
  codeChallenge: string;
};
