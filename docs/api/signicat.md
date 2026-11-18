# Signicat sandbox configuration

The API uses one server-side Signicat OpenID Connect client for MitID applicant
authentication. It validates the client settings at startup and implements the
Authorization Code flow with state, nonce, and S256 PKCE.

## Dashboard setup

In the Signicat Dashboard, create an OIDC client with:

- Authorization Code as the primary grant type.
- The exact local redirect URI
  `http://localhost:5173/api/auth/mitid/callback`.
- `openid`, `profile`, and `mitid-extra` as allowed scopes for private login.
- `mitid-business` in addition to the private scopes for business login.
- A client secret stored only in the local or deployment environment.

Copy the issuer URL from the client's well-known configuration. For a sandbox
tenant, it normally has the form
`https://<tenant>.sandbox.signicat.dev/auth/open`.

## Local callback without a public domain

The school project does not have a permanent public application domain.
Signicat permits HTTP redirect URIs when they point to localhost. Register
`http://localhost:5173/api/auth/mitid/callback` in the Signicat Dashboard. The
browser returns to Vite on port `5173`, and Vite proxies the `/api` request to
Nest on port `3000`.

Non-local redirect URIs must use HTTPS. A temporary HTTPS tunnel remains an
option when another device must complete the login or localhost cannot be used.

The existing `PUBLIC_URL` environment value belongs exclusively to Cloudflare
R2 object access. It is not the application's base URL and must not be used as
the Signicat redirect URI.

## Environment values

Configure these values in `.devcontainer/.env` for local development or in the
deployment secret store:

```dotenv
SIGNICAT_ENABLED=true
SIGNICAT_ISSUER_URL=https://<signicat-sandbox-domain>/auth/open
SIGNICAT_CLIENT_ID=<signicat-client-id>
SIGNICAT_CLIENT_SECRET=<signicat-client-secret>
SIGNICAT_REDIRECT_URI=http://localhost:5173/api/auth/mitid/callback
SIGNICAT_PRIVATE_SCOPES=openid profile mitid-extra
SIGNICAT_BUSINESS_SCOPES=openid profile mitid-extra mitid-business
```

Signicat remains disabled when `SIGNICAT_ENABLED` is absent or `false`, so the
API can start before sandbox access is provisioned. When it is `true`, the API
requires an HTTPS issuer, an HTTPS redirect or HTTP localhost redirect, the
registered callback path, and all identity scopes needed by each login context.
It derives the discovery document URL from the issuer and keeps the MitID
selection value `idp:mitid` server-side. Never commit a real client ID or
secret.

Business applicants authenticate with MitID Business using the
`mitid-business` OIDC scope. MitID Private for Business is outside the planned
login flow.

## Authorization transaction and callback

The private and business start routes create a ten-minute `AuthTransaction`
and redirect the browser to the authorization endpoint from Signicat's OIDC
discovery document. The database stores SHA-256 hashes of state and nonce, plus
the PKCE verifier. An optional return path must be local to the application.

The callback consumes the transaction atomically before exchanging the code.
A transaction can therefore be used only once, including when Signicat returns
an error or the subsequent token exchange fails. The API validates the ID-token
RS256 signature using Signicat's discovered JWKS and checks its issuer,
audience, expiry, subject, and nonce. It then retrieves UserInfo and requires
its `sub` to match the verified ID-token subject. Provider access tokens, ID
tokens, authorization codes, state, nonce, and PKCE verifiers are never
returned to the frontend or written to logs.

## Private applicant resolution

For private login, the provider adapter normalizes the `mitid_uuid` claim from
the `mitid-extra` scope. Signicat defines this as the identity provider's stable
UUID for the person. The authentication service uses it only to find a private
applicant whose `mitIdKey` has the same value.

An active match receives the normal Skilteplanen access and refresh cookies.
An inactive match is denied. An unknown identity currently receives a
`registration-required` result without credentials; Phase 4 step 5 will create
the pending registration and issue its restricted onboarding token.

## Business applicant resolution

For business login, the provider adapter requires both
`mitid_organisation_cvr` and `mitid_employee_uuid` from the `mitid-business`
scope. The CVR must contain exactly eight digits, and the employee identity must
be a UUID. Together with the matching UserInfo and ID-token subjects, these
claims establish which employee authenticated for which organization.

The authentication service resolves the shared business applicant through its
`cvrNumber`. An active match receives the normal applicant session, while an
inactive match is denied. An unknown CVR returns `registration-required`
without credentials until Phase 4 step 5 creates the pending registration and
onboarding token. The employee UUID is retained as authentication evidence and
is not stored as the business applicant's `mitIdKey`; Phase 4 step 6 will record
it in the audit event.
