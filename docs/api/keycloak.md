# Keycloak municipal SSO

Skilteplanen uses a local Keycloak realm to simulate corporate login for a
fictional municipality. Keycloak replaces the planned Microsoft Entra
integration, but it does not replace Skilteplanen sessions.

NestJS is the confidential OpenID Connect client. React only navigates to
`GET /api/auth/municipality/start`; it never receives Keycloak configuration,
client credentials, access tokens, or ID tokens. After a successful callback,
the API issues the same `HttpOnly` Skilteplanen access and refresh cookies used
by the other authenticated actors.

This simulation is not KOMBIT's Context Handler, the official municipal SAML
federation, or a source of real municipality-issued permissions.

## Local URLs

| Purpose | URL |
| --- | --- |
| Browser and token issuer | `http://localhost:8080` |
| API-to-Keycloak backchannel | `http://keycloak:8080` |
| Realm | `demo-municipality` |
| API login start | `http://localhost:5173/api/auth/municipality/start` |
| Registered callback | `http://localhost:5173/api/auth/municipality/callback` |

The browser-facing issuer and Compose backchannel deliberately use different
hosts. Keycloak is configured with `KC_HOSTNAME=http://localhost:8080`, so its
tokens have the stable browser-facing issuer. The API fetches discovery, token,
UserInfo, and JWKS endpoints over the private Compose hostname.

## Realm import and backend client

The dev container mounts
`.devcontainer/keycloak/demo-municipality-realm.json` into Keycloak's import
directory and starts Keycloak with `--import-realm`. On the first start of a new
Keycloak database, this creates the realm, client, roles, claims, and fictional
employees automatically. Keycloak skips the import when the realm already
exists, so later JSON changes do not overwrite local realm state.

The imported OpenID Connect client has these settings:

| Setting | Value |
| --- | --- |
| Client ID | `municipal-api` |
| Client authentication | On |
| Standard flow | On |
| Direct access grants | Off |
| Implicit flow | Off |
| Service accounts | Off |
| PKCE method | `S256` |
| Valid redirect URI | `http://localhost:5173/api/auth/municipality/callback` |

The client secret and fictional employee passwords are substituted from
`KEYCLOAK_CLIENT_SECRET`, `KEYCLOAK_ANNA_PASSWORD`, and
`KEYCLOAK_LARS_PASSWORD` during import. The client is confidential because
NestJS performs the code exchange; do not create `VITE_KEYCLOAK_*` variables
or install a Keycloak adapter in React.

## Configure municipal claims

The import creates these realm roles:

- `municipal-employee`
- `caseworker`
- `department-manager`
- `municipal-admin`

It also adds these protocol mappers to `municipal-api`:

1. A hardcoded string claim named `municipality_id` with value
   `demo-kommune`. Include it in the ID token and UserInfo.
2. A realm-role mapper using the token claim name `realm_access.roles`.
   Include it in the ID token and UserInfo.

The imported fictional employees are:

| Username | Fixed subject | Roles |
| --- | --- | --- |
| `anna.jensen` | `11111111-1111-4111-8111-111111111111` | `municipal-employee`, `caseworker` |
| `lars.nielsen` | `22222222-2222-4222-8222-222222222222` | `municipal-employee` |

Their passwords come from the uncommitted dev-container environment. A user
must have `caseworker` to complete the current municipal login flow.

## API environment

Configure the following values in the uncommitted dev-container environment or
`apps/api/.env`:

```dotenv
KEYCLOAK_ENABLED=true
KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/demo-municipality
KEYCLOAK_BACKCHANNEL_REALM_URL=http://keycloak:8080/realms/demo-municipality
KEYCLOAK_CLIENT_ID=municipal-api
KEYCLOAK_CLIENT_SECRET=<generated-client-secret>
KEYCLOAK_REDIRECT_URI=http://localhost:5173/api/auth/municipality/callback
KEYCLOAK_SCOPES=openid profile
KEYCLOAK_REQUIRED_ROLE=caseworker
```

`KEYCLOAK_CLIENT_SECRET` must be identical for the realm import and the API.

Keycloak remains disabled when `KEYCLOAK_ENABLED` is absent or `false`, so the
API can start before the realm has been provisioned.

## Link a pre-provisioned case worker

Successful Keycloak authentication never creates a case worker automatically.
Run the development seed from the repository root:

```bash
bun run --cwd apps/api db:seed
```

The municipality-auth seeder creates the application-side records required for
Anna's fixed Keycloak subject. It is idempotent and may be run repeatedly.
Before login, the application database must contain:

1. A `CaseWorker` assigned to the correct municipality.
2. A `MunicipalityAuthProvider` with:
   - `provider = KEYCLOAK`
   - the exact `KEYCLOAK_ISSUER_URL`
   - `municipalityClaim = demo-kommune`
   - the same municipality as the case worker
3. A `CaseWorkerExternalIdentity` connecting that provider to the case worker,
   with `subject` equal to the Keycloak user's immutable ID (`sub`).

Lars is intentionally not linked because he lacks the Keycloak `caseworker`
role and is used to verify the forbidden-login path.

Usernames and email addresses are not identity keys. A verified issuer,
subject, municipality claim, required role, and stored municipality assignment
must all agree before the API issues a session.

## Backend flow

1. The start endpoint validates the optional local return path.
2. The API stores hashed state and nonce plus a PKCE verifier in a ten-minute,
   one-use `AuthTransaction`.
3. The browser is redirected to Keycloak with server-controlled parameters.
4. The callback consumes the transaction before exchanging the code.
5. The provider adapter validates the ID-token signature, issuer, audience,
   expiry, and nonce through discovery and JWKS, then binds UserInfo to the same
   subject.
6. The service checks `municipality_id`, the configured role, the external
   identity link, and the stored municipality.
7. An eligible case worker receives Skilteplanen access and refresh cookies;
   provider tokens are discarded and never returned to React or logged.

Unknown or mismatched employees receive `403`. Invalid, expired, replayed, or
provider-rejected callbacks receive `401`. Provider unavailability during login
start receives `503`.
