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
bootstrap procedure. Case workers will authenticate through a local Keycloak
municipal SSO simulation rather than Microsoft Entra ID. The existing
Entra-oriented provider persistence is therefore legacy groundwork and must be
adapted to Keycloak issuer-plus-subject identities during Phase 5. Phase 4 step
1 supports explicitly enabled, validated server-side Signicat
sandbox OIDC configuration, including its redirect URI and private and
business scopes. Phase 4 step 2 now implements persisted one-time OIDC
transactions, state and nonce hashing, S256 PKCE, authorization redirects,
code exchange, and Signicat ID-token validation through discovery and JWKS.
Phase 4 step 3 now retrieves Signicat UserInfo, validates its subject against
the ID token, resolves private applicants through `mitIdKey`, denies inactive
applicants, and issues sessions for active matches. Phase 4 step 4 now requires
verified MitID Business organization and employee claims, resolves business
applicants through CVR, denies inactive applicants, and issues sessions for
active matches. Phase 4 step 6 now records the verified employee UUID and
provider subject for successful business logins. Phase 4 step 5, pending
registration and UC-001 token exchange, remains assigned to the applicant
module outside the authentication feature branch. Phase 5 now has a
backend-owned Keycloak implementation: reproducible local realm provisioning,
validated server-side configuration, one-time OIDC transactions with S256
PKCE, discovery and JWKS validation, issuer-plus-subject case-worker linking,
role and municipality enforcement, auditing, and Skilteplanen session issuance.
A live browser login remains to be verified after rebuilding the dev container
and supplying the local Keycloak client secret and fictional-user passwords.

## Goals

- Protect the API by default. A request must either authenticate through an explicitly public auth route or contain a valid Skilteplanen access token.
- Support four login contexts:
  - Private applicant through Signicat and MitID Private.
  - Business applicant through Signicat and MitID Business.
  - Municipal case worker through a fictional municipality's Keycloak corporate SSO simulation.
  - Administrator through local e-mail/password authentication.
- Use JWT because it is familiar to the project group.
- Support first-time applicant onboarding without granting normal API access before registration is complete.
- Keep authorization decisions in the backend and scope data access to the current applicant, municipality, or administrator role.
- Keep the implementation appropriately limited for a school project.

## Explicit scope limitations

- Skilteplanen will not implement application-managed MFA for administrator login.
- Case workers authenticate only through the Keycloak municipal SSO simulation.
  Skilteplanen does not provide local credentials or a manual fallback when
  Keycloak denies or cannot complete a login.
- The first implementation supports Signicat OIDC for applicants and a local
  Keycloak realm for fictional municipal employees, not arbitrary identity
  providers.
- Keycloak represents a fictional `Demo Kommune` and is not an implementation
  of KOMBIT's Context Handler, the official municipal SAML federation, or real
  municipality-issued permissions.
- The first implementation uses redirect-based OIDC, not Signicat's headless Authentication REST API.
- No mobile-app or third-party API authentication is planned.
- No access-token denylist or immediate per-token revocation is planned. Short access-token lifetimes limit the remaining validity window.
- No per-employee allowlist is planned for business applicants. A verified employee acting for the same CVR accesses the same business applicant.

## Core architecture decision

The API uses short-lived Skilteplanen JWT access tokens stored in an `HttpOnly`,
`Secure`, `SameSite=Lax` cookie rather than browser storage. This applies to
applicants, case workers, and administrators.

NestJS, not React, is the confidential Keycloak OIDC client. The API creates
the authorization transaction, redirects the browser to Keycloak, handles the
callback, exchanges the authorization code, validates provider tokens, resolves
the case worker, and then issues the normal Skilteplanen access and refresh
cookies. Keycloak tokens and client credentials are never exposed to React.

The Skilteplanen JWT establishes the authenticated principal but does not
contain all mutable authorization data.
The API loads current data such as applicant activity, municipality assignment,
and `isSuperUser` from PostgreSQL when authorizing a request. Keycloak roles and
groups may be required as authentication evidence, but they do not replace the
API's resource and municipality authorization checks.

Active users may receive an opaque refresh token. Refresh tokens are random
values stored as hashes in PostgreSQL and rotated when used. This introduces
limited server-side state but keeps provider credentials and session handling
out of the frontend.

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
- Validate Signicat and Keycloak server-side OIDC settings when those providers
  are enabled.

## Default-deny API access

Register a global NestJS guard through `APP_GUARD`. Every API route requires a
valid Skilteplanen access JWT unless it has explicit route metadata allowing
another behavior.

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

Before redirecting to Signicat or Keycloak, create a short-lived
`AuthTransaction` containing:

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

Client-provided issuer, realm, scope, audience, or redirect parameters must not
be trusted. Login-start endpoints select server-controlled provider
configuration. React knows only the API route and never receives provider
configuration, tokens, or client credentials.

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

### Keycloak simulation path

1. Run a local Keycloak instance with the fictional `demo-municipality` realm.
2. Configure a confidential Keycloak client owned by NestJS. Enable
   Authorization Code flow with S256 PKCE and register the exact backend
   callback URI `/api/auth/municipality/callback`. Store its client secret only
   in the API environment.
3. The case worker selects municipal login and React navigates to
   `GET /api/auth/municipality/start`.
4. NestJS creates a one-time `AuthTransaction` and redirects the browser to
   Keycloak using server-controlled realm, client, scope, and redirect values.
5. Keycloak authenticates the fictional employee and redirects to the backend
   callback with state and an authorization code.
6. NestJS consumes the transaction once, exchanges the code using its client
   credentials and PKCE verifier, and validates signature, issuer, audience,
   nonce, and expiry through Keycloak discovery and JWKS.
7. Normalize the verified `iss` + `sub` identity and required
   `municipality_id` and role claims. Match it to a pre-provisioned case worker
   and require the claimed municipality to match the stored assignment.
8. Do not automatically create case workers after successful Keycloak
   authentication.
9. For an eligible case worker, issue the normal Skilteplanen access and
   refresh cookies with `actor: CASE_WORKER`; discard provider tokens after the
   callback.
10. Reject invalid provider responses with `401`; reject unknown, mismatched,
    deleted, or insufficiently privileged employees with `403` without issuing
    Skilteplanen credentials.

If Keycloak rejects, is unavailable, or cannot complete login, the API denies
case-worker access and issues no access or refresh token. There is no local
credential or manual fallback route.

The local realm models one fictional municipality. External identities use
the verified issuer and subject rather than usernames or email addresses,
which are not stable or globally unique.

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
- Keycloak realm issuer, confidential backend client ID and secret, callback
  URI, scopes, expected audience, and fictional municipality identifier.
- Password-hashing parameters.
- Refresh-token lifetime.

Use separate Signicat sandbox and production configuration. Keep the Keycloak
client secret in the API environment and never expose it through `VITE_*`
variables. Never commit provider secrets or signing keys.

## Planned data-model changes

### Applicant

- Make `mitIdKey` nullable and unique; require it for `Private` applicants.
- Make `cvrNumber` unique when present; require it for `Business` applicants.
- Continue using `isActive` as an authorization check.

### CaseWorker

- Keep `municipalityId` non-unique so one municipality can contain multiple case workers.
- Do not use local case-worker passwords; remove `passwordHash` in a separately
  reviewed schema migration.
- Link pre-provisioned case workers to Keycloak through the verified issuer and
  subject. Remove the Entra-specific tenant requirement from this identity
  mapping when the schema is migrated.
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
- Municipality/provider mapping for the allowed Keycloak issuer and
  `municipality_id`, plus issuer-and-subject case-worker identities.

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
│   └── keycloak.provider.ts
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

Keep provider-specific claim mapping inside provider adapters. Domain services
should receive a normalized authenticated identity rather than raw Keycloak
claims or tokens.

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

### Phase 5: Keycloak municipal SSO simulation

Use `municipal-keycloak-sso-guide.md` only as a reference for provisioning the
local Keycloak service, realm, fictional users, roles, and claims. Its React
adapter and frontend token-handling steps do not apply to this repository; the
backend-owned flow below is authoritative.

1. Add the local Keycloak and PostgreSQL services and create the fictional
   `demo-municipality` realm.
2. Configure fictional employees, departments, realm roles, a confidential
   backend OIDC client, S256 PKCE, `municipality_id`, the expected audience,
   and the exact API callback URI.
3. Add validated server-side Keycloak configuration without adding Keycloak
   configuration or credentials to the web app.
4. Implement the NestJS Keycloak provider adapter, persisted one-time OIDC
   transactions, authorization redirects, code exchange, and validation of
   signature, issuer, audience, nonce, and expiry through discovery and JWKS.
5. Replace the Entra-specific provider schema assumptions and link verified
   `iss` + `sub` identities to pre-provisioned case workers.
6. Deny missing, invalid, unknown, mismatched, deleted, or insufficiently
   privileged employees.
7. Issue Skilteplanen case-worker sessions through the existing cookie and
   refresh-token infrastructure and test Keycloak SSO session behavior.

### Phase 6: Authorization

1. Add current-principal resolution.
2. Add applicant ownership checks.
3. Add municipality scoping to case-worker queries.
4. Add municipal-superuser guards.
5. Add administrator guards.
6. Review every controller and repository query for authorization scope.

### Phase 7: Frontend integration

1. Add private, business, municipal, and administrator login choices.
2. Redirect all external-provider login choices through backend login-start
   routes.
3. Load authentication state through `GET /api/auth/me`.
4. Handle onboarding-required responses.
5. Handle cancelled login, unavailable provider, forbidden account, expired token, and logout states.
6. Never expose Signicat or Keycloak provider tokens to React.

### Phase 8: Verification and documentation

1. Add unit and integration tests.
2. Run Signicat sandbox login tests.
3. Run the Keycloak fictional-employee, audience, role, and SSO tests.
4. Add environment and provider setup documentation.
5. Document known school-project limitations and future hardening options.

## Test plan

### Global access control

- Protected endpoints return `401` without the credential required by their
  authentication context.
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

- A correctly configured fictional employee can complete Keycloak
  Authorization Code flow with S256 PKCE.
- The backend callback rejects invalid or reused state, invalid nonce, failed
  code exchange, expired or incorrectly signed tokens, and wrong issuer or
  audience without issuing a session.
- A verified `iss` + `sub` identity resolves only to its pre-provisioned case
  worker and stored municipality.
- Unknown, deleted, or municipality-mismatched case workers are rejected.
- A user without the required Keycloak role receives `403` for case-worker
  operations.
- An eligible linked case worker receives Skilteplanen access and refresh
  cookies, while Keycloak tokens remain server-side and are discarded after
  authentication.
- Keycloak rejection or unavailability yields no Skilteplanen credentials and
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
2. Rebuild the dev container with local Keycloak secrets so the committed realm
   import can provision the confidential backend client and fictional
   employees, then run a live browser login. Do not follow the reference
   guide's frontend-adapter integration steps.

## Related diagrams and research

- [Private applicant login sequence](https://drive.google.com/file/d/1JTGEBK1dKJjYUZSUrMbBfNsWJnC2kW2x/view?usp=drivesdk)
- [Business applicant login sequence](https://drive.google.com/file/d/1p00nlcPAOe8hsCKLkppoyrwTDh-YCsbk/view?usp=drivesdk)
- [Municipal case-worker login sequence](https://drive.google.com/file/d/1a5PLixWz_hF46R0jlGe7JRN765svoSCR/view?usp=drivesdk)
- [Municipal Keycloak SSO guide](./municipal-keycloak-sso-guide.md)
- [Administrator login sequence](https://drive.google.com/file/d/1G0rzzBK1I3fX3Qg4WLfzUEfSqdAqFAR1/view?usp=drivesdk)
- [JWT versus database sessions](https://docs.google.com/document/d/1p9TYwgUioTDOCfpphzP80Z9o6JiOe2S_TfTVjBS-y8M)
- [Signicat MitID OIDC integration](https://developer.signicat.com/identity-methods/mitid/integration-guide/oidc-mitid/)
- [Signicat MitID attributes](https://developer.signicat.com/identity-methods/mitid/attributes-reference/)
- [Keycloak OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://datatracker.ietf.org/doc/html/rfc9700)
