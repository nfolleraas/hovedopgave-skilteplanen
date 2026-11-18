# Authentication persistence

The authentication persistence models are defined in
[`authentication.prisma`](../../apps/api/prisma/domain/authentication.prisma).
They support OIDC login transactions, applicant onboarding, refresh-token
rotation, municipality identity-provider configuration, case-worker identity
linking, and authentication auditing.

## Design principles

- Short-lived authentication data has an explicit expiry time.
- One-time data has a `consumedAt` or `revokedAt` marker.
- Refresh tokens are stored as hashes, never as usable token values.
- Provider-specific secrets remain in environment configuration.
- Generic principal fields support applicants, case workers, and administrators
  without forcing every authentication record to reference one user table.
- External identities are linked to pre-provisioned domain users.

## OIDC transactions

`AuthTransaction` represents one login attempt before the identity provider
redirects the user back to the API.

| Field | Purpose |
| --- | --- |
| `provider` | Identifies the provider used for the transaction. |
| `loginType` | Records whether the flow is private applicant, business applicant, or municipal login. |
| `stateHash` | Identifies the transaction and supports state validation without storing the raw state. It is unique. |
| `nonceHash` | Supports OIDC nonce validation without storing the raw nonce. |
| `pkceVerifier` | Allows the API to complete the authorization-code exchange. |
| `returnPath` | Stores the intended post-login path when one was supplied by the server. |
| `expiresAt` | Limits the lifetime of the login attempt. |
| `consumedAt` | Prevents a callback from being accepted more than once. |

The login-start endpoint creates this record before redirecting to the
provider. The callback should find the record by the returned state, validate
the provider response, and atomically mark the record as consumed. Expired or
already-consumed transactions must be rejected.

The PKCE verifier is required by the code exchange and therefore cannot be
stored only as a hash. It must never be logged or exposed to the frontend.

## Pending applicant registration

`PendingRegistration` represents a successfully authenticated applicant who
has not completed the applicant-creation use case yet.

For a private applicant, `externalIdentityKey` stores the stable private
identity key. For a business applicant, `cvrNumber` identifies the business,
while `providerSubject` and `providerTenantId` preserve the verified employee
identity used during authentication and auditing.

The record is temporary:

1. The provider callback creates a pending registration.
2. The API issues an onboarding token that refers to the registration.
3. The applicant completes the required registration data.
4. The API creates the applicant and sets `consumedAt`.
5. The onboarding token is replaced with a normal access token.

`expiresAt` prevents abandoned registrations from remaining valid forever.
Pending registrations do not receive refresh tokens.

## Domain identity constraints

The existing domain models now enforce the identity assumptions used by the
authentication flows:

- Private applicants require a unique `mitIdKey` and do not use a CVR.
- Business applicants require a unique `cvrNumber` and do not use a private
  MitID key as their permanent identity.
- Case workers authenticate through their linked corporate identity only; local
  case-worker passwords are not an authentication path. Deleting a case worker
  removes the account rather than toggling an active state. The municipality
  relation remains non-unique, so one municipality can have multiple case
  workers.
- Administrators have a normalized, unique e-mail address. Deleting an
  administrator removes the account rather than toggling an active state.

The database migration normalizes existing administrator e-mail addresses
before creating the unique index. Application code must continue to normalize
new e-mail input before storing or looking it up.

## Refresh-token rotation

`RefreshToken` stores the hash of an opaque refresh-token value. The record
also stores the generic `principalId` and the `actor` type so the API can
resolve the current applicant, case worker, or administrator before issuing a
new access token.

The rotation relation forms a one-way chain:

```text
old token --> replacedById --> new token
```

`replacedById` is unique, so one token cannot be replaced by multiple tokens.
`revokedAt` records logout, password-change, or administrative revocation.
`expiresAt` limits the maximum session lifetime.

When a refresh request succeeds, the API should create a replacement token and
revoke the old one in the same database transaction. Reusing an already
replaced token must be rejected and recorded as a security event.

## Municipality provider configuration

`MunicipalityAuthProvider` maps an external identity provider to a
municipality. It currently supports the planned Microsoft Entra ID flow while
keeping the domain model provider-neutral.

- `issuer` identifies the expected OIDC issuer.
- `tenantId` identifies the accepted organizational tenant.
- `municipalityId` scopes the provider to one municipality.
- The unique constraints prevent duplicate provider and tenant mappings.

Client secrets and certificates are intentionally not stored in this model.
They belong in environment or deployment-secret configuration.

The relation is exposed from [`Municipality`](../../apps/api/prisma/domain/municipality.prisma)
through `authProviders`.

## Case-worker external identities

`CaseWorkerExternalIdentity` links a provider subject to an existing
[`CaseWorker`](../../apps/api/prisma/domain/case-worker.prisma). Successful
corporate authentication therefore identifies a pre-provisioned employee
instead of automatically creating a new case worker.

The two compound unique constraints enforce both directions of the mapping:

- A provider subject can belong to only one case worker within a provider.
- A case worker cannot have the same provider mapping more than once.

The relations use cascade deletion so identity links do not remain after the
related case worker or municipality provider is removed.

## Authentication audit events

`AuthAuditEvent` records important authentication outcomes, including login
successes and failures, logout, refresh, refresh-token reuse, and onboarding.

`principalId` is intentionally generic because an event can belong to any
authentication actor. `metadata` may contain safe diagnostic context, such as
an employee subject or failure reason, but must never contain passwords, raw
tokens, authorization codes, PKCE verifiers, CPR numbers, or client secrets.

The event should be append-only from the application’s perspective. Audit
records support security investigation and user tracing without becoming part
of the authorization decision itself.

## Authentication enums

The authentication enums are defined in
[`enums.prisma`](../../apps/api/prisma/enums/enums.prisma):

- `AuthActor` identifies the authenticated domain role.
- `AuthProvider` identifies Signicat, Entra ID, or local authentication.
- `AuthLoginType` identifies the login flow.
- `AuthAuditEventType` provides a controlled vocabulary for audit records.

Keeping these values in Prisma prevents inconsistent strings across the API
and gives the database a constrained set of valid values.

## Responsibility boundaries

These models provide persistence only. The application services are still
responsible for:

- validating state, nonce, issuer, audience, expiry, and PKCE;
- consuming transactions and registrations exactly once;
- hashing and rotating refresh tokens;
- checking that principals still exist before issuing access tokens, while
  applying the existing applicant activity rule where applicable;
- preventing sensitive values from entering logs or audit metadata;
- applying applicant, municipality, and administrator authorization rules.

The related database migration is stored under
[`prisma/migrations`](../../apps/api/prisma/migrations/).
