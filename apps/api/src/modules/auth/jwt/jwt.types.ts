export type TokenUse = 'ONBOARDING' | 'ACCESS';
export type OnboardingApplicantType = 'Private' | 'Business';

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
