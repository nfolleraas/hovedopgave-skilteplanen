import type { RefreshSessionTokens } from '../refresh-token/refresh-token.types.js';

export type MitidLoginType = 'PRIVATE_APPLICANT' | 'BUSINESS_APPLICANT';

export type OidcAuthorizationRequest = {
  loginType: MitidLoginType;
  state: string;
  nonce: string;
  codeChallenge: string;
};

export type OidcCallbackInput = {
  state: unknown;
  code: unknown;
  error: unknown;
};

export type VerifiedOidcIdentity = {
  issuer: string;
  subject: string;
  mitidUuid?: string;
};

export type CompletedMitidAuthentication = {
  loginType: MitidLoginType;
  returnPath: string | null;
  identity: VerifiedOidcIdentity;
  status: 'authenticated' | 'provider-authenticated' | 'registration-required';
  session?: RefreshSessionTokens;
};
