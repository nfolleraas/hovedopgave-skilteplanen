export type TokenUse = 'ONBOARDING' | 'ACCESS';

export interface JwtClaims {
  issuer: 'ansoegningsplatformen-api';
  audience: 'ansoegningsplatformen-web';
  subject: string;
  actor: 'APPLICANT' | 'CASE_WORKER' | 'ADMINISTRATOR';
  tokenUse: TokenUse;
  jwtId: string;
  issuedAtTime: number;
  expirationTime: number;
}
