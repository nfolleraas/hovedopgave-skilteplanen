export type TokenUse = 'ONBOARDING' | 'ACCESS';
export type OnboardingApplicantType = 'Private' | 'Business';

export type JwtHeader = {
  alg: string;
  typ: string;
};

export type JwtPayload = {
  iss: unknown;
  aud: unknown;
  sub: unknown;
  actor: unknown;
  tokenUse: unknown;
  jti: unknown;
  iat: unknown;
  exp: unknown;
  pendingRegistrationId?: unknown;
  applicantType?: unknown;
};

export type ValidatedJwtPayload = {
  iss: string;
  aud: string;
  sub: string;
  actor: JwtClaims['actor'];
  tokenUse: TokenUse;
  jti: string;
  iat: number;
  exp: number;
  pendingRegistrationId?: string;
  applicantType?: OnboardingApplicantType;
};

export interface AccessTokenInput {
  subject: string;
  actor: JwtClaims['actor'];
}

export interface OnboardingTokenInput {
  pendingRegistrationId: string;
  applicantType: OnboardingApplicantType;
}

export interface JwtClaims {
  issuer: string;
  audience: string;
  subject: string;
  actor: 'APPLICANT' | 'CASE_WORKER' | 'ADMINISTRATOR';
  tokenUse: TokenUse;
  jwtId: string;
  issuedAtTime: number;
  expirationTime: number;
  pendingRegistrationId?: string;
  applicantType?: OnboardingApplicantType;
}
