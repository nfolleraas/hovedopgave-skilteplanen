# Authentication and API Access Plan

## Status

This document captures the authentication and session-handling decisions made
during planning. Phase 1 token configuration, authentication persistence,
domain constraints, and their Prisma migrations have been implemented and
applied. Phase 2 step 1, JWT signing and validation, is now implemented with
HS256 and standard JWT wire claims. Phase 2 step 2, access and onboarding token
purposes, is also implemented with separate lifetimes and claims. Phase 2 step
3 now implements hashed opaque refresh tokens, transactional rotation, reuse
detection, and revocation. Phase 2 step 4 now applies a global default-deny
access-token guard. Phase 2 step 5 adds explicit public and onboarding route
metadata. Phase 2 step 6 limits Swagger to development, completing Phase 2.
Phase 3 now implements API-only Argon2id password handling, administrator
login, administrator login rate limiting and auditing, and a first-account
bootstrap procedure. Case workers continue to authenticate only through Entra
ID. Phase 4 step 1 supports explicitly enabled, validated server-side Signicat
sandbox OIDC configuration, including its redirect URI and private and
business scopes. Phase 4 step 2 now implements persisted one-time OIDC
transactions, state and nonce hashing, S256 PKCE, authorization redirects,
code exchange, and Signicat ID-token validation through discovery and JWKS.
Phase 4 step 3, private-applicant identity lookup through `mitIdKey`, is next.

## Goals

- Protect the API by default. A request must either authenticate through an explicitly public auth route or contain a valid Skilteplanen access token.
- Support four login contexts:
  - Private applicant through Signicat and MitID Private.
  - Business applicant through Signicat and MitID Business.
  - Municipal case worker through the municipality's corporate identity provider, initially Microsoft Entra ID.
  - Administrator through local e-mail/password authentication.
- Use JWT because it is familiar to the project group.
- Support first-time applicant onboarding without granting normal API access before registration is complete.
- Keep authorization decisions in the backend and scope data access to the current applicant, municipality, or administrator role.
- Keep the implementation appropriately limited for a school project.

## Explicit scope limitations

- Skilteplanen will not implement application-managed MFA for administrator login.
- Case workers authenticate only through their municipality's corporate identity
  provider. Skilteplanen does not provide local credentials or a manual fallback
  when Microsoft Entra ID denies or cannot complete a login.
- A municipality's external identity provider may enforce its own MFA or Conditional Access policy, but this is outside Skilteplanen's implementation.
- The first implementation supports Signicat OIDC and Microsoft Entra ID OIDC, not arbitrary identity providers.
- The first implementation uses redirect-based OIDC, not Signicat's headless Authentication REST API.
- No mobile-app or third-party API authentication is planned.
- No access-token denylist or immediate per-token revocation is planned. Short access-token lifetimes limit the remaining validity window.
- No per-employee allowlist is planned for business applicants. A verified employee acting for the same CVR accesses the same business applicant.

## Core architecture decision

The API uses short-lived JWT access tokens. The JWT is stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie rather than browser storage.

The JWT establishes the authenticated principal but does not contain all mutable authorization data. The API loads current data such as applicant activity, municipality assignment, and `isSuperUser` from PostgreSQL when authorizing a request. This avoids relying on stale role and organization claims.

Active users may receive an opaque refresh token. Refresh tokens are random values stored as hashes in PostgreSQL and rotated when used. This introduces limited server-side state but keeps access-token handling familiar to the group.

### Token purposes

Use two distinct token purposes. The internal TypeScript contract in
`apps/api/src/modules/auth/jwt/jwt.types.ts` keeps the existing names:

```ts
type TokenUse = 'ONBOARDING' | 'ACCESS';

interface JwtClaims {
  issuer: 'ansoegningsplatformen-api';
  audience: 'ansoegningsplatformen-web';
  subject: string;
  actor: 'APPLICANT' | 'CASE_WORKER' | 'ADMINISTRATOR';
  tokenUse: TokenUse;
  jwtId: string;
  issuedAtTime: number;
  expirationTime: number;
}
```

The JWT service maps these internal names to standard claims at the JWT
boundary: `issuer` to `iss`, `audience` to `aud`, `subject` to `sub`, `jwtId`
to `jti`, `issuedAtTime` to `iat`, and `expirationTime` to `exp`. Provider
claims that are not needed by the frontend should not be exposed in the
cookie.

### Onboarding JWT

- Issued after successful MitID authentication when no applicant exists.
- Short-lived, 15 minutes.
- Has `tokenUse: ONBOARDING` internally.
- Does not receive a refresh token.
- Can access only:
  - `GET /api/auth/me`
  - Applicant registration endpoints required by UC-001.
  - `POST /api/auth/logout`
- Cannot access applications or other normal authenticated routes.

After applicant creation succeeds, the backend consumes the pending registration, creates the applicant, and replaces the onboarding JWT with an access JWT.

### Access JWT

- Issued for an existing eligible principal or after onboarding is completed.
- Short-lived, 10 minutes.
- Has `tokenUse: ACCESS` internally.
- Uses the application principal as `sub`:
  - Applicant UUID for private and business applicants.
  - Case-worker identifier for case workers.
  - Administrator UUID for administrators.
- May be renewed through a valid rotating refresh token.

### Refresh tokens

- Use opaque random values, not JWTs.
- Store only a hash in PostgreSQL.
- Associate the record with the principal, creation time, expiry, revocation time, and replacement token.
- Rotate on every successful refresh.
- Revoke on logout and password change.
- Before issuing a new access JWT, verify that the principal still exists. Apply the existing applicant activity rule where applicable.
- Onboarding tokens do not use refresh tokens.

### Cookie configuration

- Store the access token in an `HttpOnly` cookie named `sk_access`.
- Store the refresh token in an `HttpOnly` cookie named `sk_refresh`.
- Use `SameSite=Lax` for both cookies.
- Set `Secure` outside local development.
- Scope the refresh cookie to `/api/auth` so refresh and logout can both use it.
- Keep the access cookie scoped to the API routes that require it.

### Authentication configuration

- Sign JWTs with `HS256` using one strong secret from `AUTH_JWT_SECRET`.
- Require `AUTH_JWT_SECRET` to contain at least 32 characters; do not provide a
  committed or implicit default value.
- Validate the issuer, audience, token lifetimes, cookie names, cookie paths,
  and cookie security setting during API startup.
- Use the following core environment variables:
  - `AUTH_JWT_SECRET`
  - `AUTH_JWT_ISSUER`
  - `AUTH_JWT_AUDIENCE`
  - `AUTH_ACCESS_TOKEN_TTL_SECONDS`
  - `AUTH_ONBOARDING_TOKEN_TTL_SECONDS`
  - `AUTH_REFRESH_TOKEN_TTL_SECONDS`
  - `AUTH_ACCESS_COOKIE_NAME`
  - `AUTH_REFRESH_COOKIE_NAME`
  - `AUTH_ACCESS_COOKIE_PATH`
  - `AUTH_REFRESH_COOKIE_PATH`
  - `AUTH_COOKIE_SECURE`
- Validate Signicat and Microsoft Entra settings when those providers are
  enabled in their later implementation phases.

## Default-deny API access

Register a global NestJS guard through `APP_GUARD`. Every API route requires a valid access JWT unless it has explicit route metadata allowing another behavior.

Recommended route metadata:

- `@Public()` bypasses JWT authentication for the small set of public auth and health routes.
- `@AllowOnboarding()` requires a valid onboarding JWT.
- `@AllowAnyAuthenticated()` accepts a valid access JWT or onboarding JWT for
  shared routes such as `GET /api/auth/me` and `POST /api/auth/logout`.
- All other routes require `tokenUse: access`.
- Role and resource guards run after authentication.

### Public routes

Expected public routes include:

```text
GET  /api/auth/mitid/private/start
GET  /api/auth/mitid/business/start
GET  /api/auth/mitid/callback

GET  /api/auth/municipality/start
GET  /api/auth/municipality/callback

POST /api/auth/admin/login
POST /api/auth/refresh

GET  /api/health
```

`POST /api/auth/refresh` is public only in the NestJS metadata sense; it must validate the refresh cookie before doing anything.

Swagger should be disabled or protected outside development. Whether health remains public in production is a deployment decision.

### Authenticated routes

Examples:

```text
GET  /api/auth/me
POST /api/auth/logout
POST /api/auth/logout-all

/api/applications/**
/api/applicants/**
/api/case-workers/**
/api/municipalities/**
```

The UC-001 applicant-creation endpoint uses `@AllowOnboarding()` rather than `@Public()`.

## OIDC transaction handling

Before redirecting to Signicat or a municipality identity provider, create a short-lived `AuthTransaction` containing:

- Provider and login type.
- OIDC state.
- Nonce.
- PKCE verifier.
- Intended return path.
- Creation and expiry timestamps.
- Consumption timestamp or consumed flag.

The callback must:

1. Load and consume the transaction exactly once.
2. Compare the returned state.
3. Exchange the authorization code using the PKCE verifier.
4. Validate token signature through provider discovery/JWKS.
5. Validate issuer, audience, nonce, expiry, and required provider claims.
6. Resolve the application principal.
7. Issue the appropriate onboarding or access JWT.

Client-provided issuer, tenant, scope, or redirect parameters must not be trusted. Login-start endpoints select server-controlled provider configuration.

## Private applicant login

1. The user selects private-person login.
2. The API starts Signicat OIDC with the MitID Private configuration.
3. Signicat authenticates the user and returns to the API callback.
4. The API validates the OIDC transaction and tokens.
5. The API resolves the applicant through the stable MitID identity stored in `Applicant.mitIdKey`.
6. If the applicant exists and is active, issue an access JWT.
7. If the applicant does not exist, create a `PendingRegistration` and issue an onboarding JWT.
8. After UC-001 completes, create the private applicant and replace the onboarding JWT with an access JWT.

For a private applicant:

- `mitIdKey` is required and unique.
- `cvrNumber` is absent.
- The applicant represents one private individual.

## Business applicant login

1. The user selects business login.
2. The API starts Signicat OIDC with the MitID Business scope/configuration.
3. Signicat returns a verified organization CVR and employee-specific identity claims.
4. The API validates that the response establishes the employee's relationship to the organization.
5. The API resolves the business applicant by CVR.
6. If the business applicant exists and is active, issue an access JWT for that applicant.
7. Record the employee UUID/subject in the authentication audit event so the human who logged in can be traced.
8. If the business applicant does not exist, create a `PendingRegistration` containing the verified CVR and employee audit identity, then issue an onboarding JWT.
9. After UC-001 completes, create the business applicant and replace the onboarding JWT with an access JWT.

For a business applicant:

- `cvrNumber` is required and unique.
- CVR identifies the business account.
- An employee-specific MitID UUID must not be stored as the business's permanent identity key.
- Several verified employees associated with the same CVR may log into the same applicant.
- Employee identity is authentication evidence/audit data, not a separate Skilteplanen user in the first implementation.

The applicant schema therefore needs to support `mitIdKey` for private applicants and unique `cvrNumber` for business applicants. The conditional requirement is enforced in application validation and, if practical, a database check constraint.

## Municipal case-worker login

### Corporate-login path

1. The case worker selects municipal login.
2. The API starts the municipality's configured OIDC flow, initially Microsoft Entra ID.
3. Use authorization-code flow with PKCE and the organizational account audience.
4. Validate issuer, audience, signature, nonce, and tenant ID.
5. Require the tenant ID to exist in the municipality allowlist/mapping.
6. Match the provider subject to a pre-provisioned case worker.
7. Do not automatically create case workers after successful corporate authentication.
8. If the case worker exists, issue an access JWT.
9. If the case worker is unknown or deleted, return `403` without issuing a JWT and instruct the user to contact the municipality's superuser.

If Entra ID rejects, is unavailable, or cannot complete the login, the API
must issue no access or refresh token and deny case-worker access. There is no
local credential or manual fallback route.

The domain should remain provider-neutral even though Entra ID is the first implementation. A municipality-provider configuration stores issuer, tenant, client configuration, and the related municipality.

A municipality must be able to have multiple case workers, so `municipalityId`
must not be unique. `CaseWorker.passwordHash` is not used for authentication
and should be removed in a separately reviewed schema migration.

## Administrator login

Administrators use local e-mail/password login without MFA.

1. Accept e-mail and password through `POST /api/auth/admin/login`.
2. Apply endpoint and account-based rate limiting.
3. Find the administrator by normalized unique e-mail.
4. Verify `passwordHash` using Argon2id.
5. Verify that the administrator exists.
6. Log successful and failed attempts.
7. On success, issue an access JWT with `actor: ADMINISTRATOR`.
8. On failure, return a generic response that does not reveal whether the account exists.

### Known rate-limiter vulnerabilities

The initial limiter is intentionally limited to the school-project deployment:

- It uses the source IP observed by Express without configuring a trusted proxy
  chain. Behind a reverse proxy, several or all clients may share one observed
  address, so five failed attempts can temporarily block administrator login
  for every client. A production deployment must configure its exact proxy
  chain and should enforce the endpoint limit at the edge.
- Its in-memory map removes an expired counter only when the same key is queried
  again. Counters for one-off e-mail addresses can therefore remain until the
  API process restarts and sustained distributed abuse can grow memory usage.
  Production hardening should use a bounded store with proactive expiry.
- Counters apply per API process. A future multi-instance deployment must move
  them to shared infrastructure or an edge rate limiter.

These vulnerabilities are accepted for the single-process school project and
must be revisited before a production deployment.

The project needs a documented first-administrator bootstrap procedure. No default password or credential may be committed to the repository.

## Authorization rules

Authentication establishes the principal. Authorization still loads current domain data and enforces resource ownership.

### Applicant

- May read and change its own profile within application rules.
- May access only applications belonging to the same applicant.
- A business applicant acts as the business identified by its CVR.

### Case worker

- Must exist and be linked to the requested municipality.
- May access only resources belonging to the assigned municipality.
- Superuser actions require the current database value of `isSuperUser`.
- Creating, updating, or deleting case workers requires municipality-superuser authorization.

### Administrator

- May perform explicitly defined system-wide administrative operations.
- Administrative access should use dedicated guards rather than relying only on a JWT actor string.

Every repository query for a protected resource must include or validate the relevant applicant or municipality scope. Hiding frontend controls is not authorization.

## Cookie and request security

- Submit passwords only over HTTPS and hash or verify them only in the API.
  Client-side password hashes are password-equivalent replay credentials and
  must not replace TLS.
- Store access and refresh credentials in `HttpOnly` cookies.
- Set `Secure` outside local development.
- Use `SameSite=Lax`.
- Use narrowly scoped cookie paths where practical, especially for the refresh token.
- Apply CSRF protection to state-changing cookie-authenticated requests. At minimum, validate the request origin; preferably also use a CSRF token.
- Do not put JWTs or provider tokens in `localStorage`.
- Do not log tokens, authorization codes, PKCE verifiers, passwords, CPR numbers, or provider client secrets.
- Rotate the access JWT after onboarding and significant privilege changes.

## Configuration and secrets

Validate required environment configuration at startup. Expected configuration includes:

- Skilteplanen JWT issuer, audience, signing key/private key, and lifetimes.
- Cookie names and production security settings.
- Signicat sandbox domain, client ID, client secret, redirect URI, and scopes.
- Microsoft Entra client ID, client secret/certificate, redirect URI, and allowed tenant IDs.
- Password-hashing parameters.
- Refresh-token lifetime.

Use separate Signicat sandbox and production configuration. Never commit provider secrets or signing keys.

## Planned data-model changes

### Applicant

- Make `mitIdKey` nullable and unique; require it for `Private` applicants.
- Make `cvrNumber` unique when present; require it for `Business` applicants.
- Continue using `isActive` as an authorization check.

### CaseWorker

- Keep `municipalityId` non-unique so one municipality can contain multiple case workers.
- Do not use local case-worker passwords; remove `passwordHash` in a separately
  reviewed schema migration.
- Add provider-linking fields or a separate external-identity record for issuer, tenant ID, and provider subject.
- Delete the case-worker account when access must be removed.

### Administrator

- Make e-mail unique and normalized.
- Keep the Argon2id password hash.
- Delete the administrator account when access must be removed.

### New authentication models

- `AuthTransaction` for OIDC state, nonce, PKCE, expiry, and one-time consumption.
- `PendingRegistration` for authenticated applicants who have not completed UC-001.
- `RefreshToken` for hashed, rotating, revocable refresh tokens.
- `AuthAuditEvent` or equivalent audit storage for important authentication events.
- Municipality/provider mapping for allowed Entra tenants and OIDC configuration.

Use Prisma migrations for all schema changes. Do not edit generated Prisma client files manually.

## NestJS module structure

The existing auth skeleton should be expanded and imported into the root module.

Suggested responsibilities:

```text
AuthModule
├── AuthController
├── AuthService
├── JwtService / token service
├── RefreshTokenService
├── AuthTransactionService
├── PasswordService
├── providers/
│   ├── signicat.provider.ts
│   └── entra.provider.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── onboarding.guard.ts
│   ├── applicant.guard.ts
│   ├── case-worker.guard.ts
│   └── administrator.guard.ts
└── decorators/
    ├── public.decorator.ts
    ├── allow-onboarding.decorator.ts
    └── allow-any-authenticated.decorator.ts
```

Keep provider-specific claim mapping inside provider adapters. Domain services should receive a normalized authenticated identity.

## Implementation phases

### Phase 1: Foundation and schema

1. Finalize token and cookie configuration.
2. Add authentication configuration validation.
3. Add `AuthTransaction`, `PendingRegistration`, `RefreshToken`, provider mapping, and audit persistence.
4. Update applicant, case-worker, and administrator constraints.
5. Create and apply the Prisma migration.

### Phase 2: JWT and default-deny API

1. Implement JWT signing and validation.
2. Implement access and onboarding token purposes.
3. Implement refresh-token hashing, rotation, and revocation.
4. Add the global default-deny guard.
5. Add `@Public()` and `@AllowOnboarding()` metadata.
6. Protect Swagger outside development.

At the end of this phase, existing API routes must return `401` without a valid access JWT unless explicitly public.

### Phase 3: Local authentication

1. Implement Argon2id password handling.
2. Implement administrator login.
3. Add rate limiting, generic error responses, and audit events for administrator login.
4. Document first-administrator bootstrap.

### Phase 4: Signicat and applicant onboarding

1. Configure the Signicat sandbox OIDC client.
2. Implement OIDC authorization transactions and callbacks.
3. Implement private-applicant identity lookup through `mitIdKey`.
4. Implement business-applicant lookup through verified CVR.
5. Implement pending registration and UC-001 token exchange.
6. Record business employee identity in audit events.

### Phase 5: Municipality corporate login

1. Configure the Entra application and test tenant.
2. Implement the Entra OIDC adapter.
3. Add tenant-to-municipality allowlisting.
4. Implement pre-provisioned case-worker identity linking.
5. Deny unknown, mismatched, or deleted employees.

### Phase 6: Authorization

1. Add current-principal resolution.
2. Add applicant ownership checks.
3. Add municipality scoping to case-worker queries.
4. Add municipal-superuser guards.
5. Add administrator guards.
6. Review every controller and repository query for authorization scope.

### Phase 7: Frontend integration

1. Add private, business, municipal, and administrator login choices.
2. Redirect to backend login-start routes.
3. Load authentication state through `GET /api/auth/me`.
4. Handle onboarding-required responses.
5. Handle cancelled login, unavailable provider, forbidden account, expired token, and logout states.
6. Never expose provider tokens to React.

### Phase 8: Verification and documentation

1. Add unit and integration tests.
2. Run Signicat sandbox login tests.
3. Run Entra test-tenant login tests.
4. Add environment and provider setup documentation.
5. Document known school-project limitations and future hardening options.

## Test plan

### Global access control

- Protected endpoints return `401` without a JWT.
- Only explicitly public routes can be called anonymously.
- Onboarding JWTs cannot access normal protected endpoints.
- Access JWTs cannot bypass role or ownership guards.
- Tokens with invalid signature, issuer, audience, purpose, or expiry are rejected.

### Applicant authentication

- Existing private applicant receives an access JWT.
- Unknown private applicant receives an onboarding JWT.
- Completing onboarding consumes the pending registration and issues an access JWT.
- A consumed or expired onboarding token cannot create another applicant.
- Existing business CVR resolves to the same applicant for different verified employees.
- Unknown business CVR enters onboarding.
- Missing or invalid business relationship claims are rejected.

### Case-worker authentication

- Allowed Entra tenant and linked case worker receive an access JWT.
- Unknown tenant is rejected.
- Unknown or deleted case worker is rejected.
- Corporate-login callback rejects invalid state, nonce, issuer, audience, and PKCE.
- A rejected, cancelled, or unavailable Entra ID login issues no token and
  refuses case-worker access.
- No application-managed MFA is required.

### Administrator authentication

- Correct e-mail/password issues an access JWT.
- Incorrect credentials return the same generic error for existing and missing accounts.
- Repeated failures are rate-limited.
- Deleted administrators are rejected.
- No MFA is required.

### Refresh and logout

- Valid refresh token rotates and returns a new access token.
- Reuse of an already-rotated refresh token is rejected and audited.
- Logout revokes the refresh token and clears cookies.
- Refresh for a deleted principal is rejected.

### Authorization

- Applicants cannot access another applicant's applications.
- Business applicants access the business account resolved by CVR.
- Case workers cannot access another municipality's resources.
- Non-superusers cannot perform municipal-superuser operations.
- Non-administrators cannot access administrator operations.

## Remaining external setup

1. Obtain the Signicat sandbox account, OIDC client, redirect URI, and test users.
2. Obtain the Entra test tenant/application and define municipality onboarding for production tenants.

## Related diagrams and research

- [Private applicant login sequence](https://drive.google.com/file/d/1JTGEBK1dKJjYUZSUrMbBfNsWJnC2kW2x/view?usp=drivesdk)
- [Business applicant login sequence](https://drive.google.com/file/d/1p00nlcPAOe8hsCKLkppoyrwTDh-YCsbk/view?usp=drivesdk)
- [Municipal case-worker login sequence](https://drive.google.com/file/d/1a5PLixWz_hF46R0jlGe7JRN765svoSCR/view?usp=drivesdk)
- [Administrator login sequence](https://drive.google.com/file/d/1G0rzzBK1I3fX3Qg4WLfzUEfSqdAqFAR1/view?usp=drivesdk)
- [JWT versus database sessions](https://docs.google.com/document/d/1p9TYwgUioTDOCfpphzP80Z9o6JiOe2S_TfTVjBS-y8M)
- [Signicat MitID OIDC integration](https://developer.signicat.com/identity-methods/mitid/integration-guide/oidc-mitid/)
- [Signicat MitID attributes](https://developer.signicat.com/identity-methods/mitid/attributes-reference/)
- [Microsoft authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://datatracker.ietf.org/doc/html/rfc9700)
