# Signicat sandbox configuration

The API uses one server-side Signicat OpenID Connect client for MitID applicant
authentication. This configuration step validates the client settings at API
startup; authorization redirects and callbacks are implemented in the next
authentication phase.

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

The project still needs to decide whether its final business product is MitID
Business or MitID Private for Business. Both use the `mitid-business` OIDC
scope, so that decision does not change this initial client configuration.
