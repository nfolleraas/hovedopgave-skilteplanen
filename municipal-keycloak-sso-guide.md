# Simulate Danish Municipal Corporate SSO with Keycloak

This guide creates a fictional municipality called **Demo Kommune**, with Keycloak acting as its corporate identity provider. Employees authenticate through OpenID Connect (OIDC) to access a React frontend backed by a NestJS API.

You do not need Microsoft Entra, a Microsoft account, or a real municipality.

> **Scope:** This is a municipal-style SSO simulation. It does **not** implement KOMBIT's Context Handler, the official municipal SAML federation, or real municipality-issued permissions.

## Target architecture

```text
Demo Kommune (fictional organisation)
    |
    v
Keycloak
  - Employee accounts
  - Departments and groups
  - Application roles
  - Single Sign-On session
    |
    +--> React frontend (OIDC Authorization Code + PKCE)
    |
    +--> NestJS API (JWT verification + authorization)
```

| Service | Local address |
|---|---|
| Keycloak | `http://localhost:8080` |
| React frontend | `http://localhost:5173` |
| NestJS backend | `http://localhost:3000` |
| Keycloak realm | `demo-municipality` |
| React client ID | `municipal-web` |
| API audience | `municipal-api` |

The guide assumes Docker, React with Vite, and NestJS run on the same development computer. Adjust hostnames if you use remote development containers.

## Step 1. Install Keycloak with Docker Compose

Create a working folder:

```bash
mkdir municipal-keycloak
cd municipal-keycloak
```

Create `.env`:

```dotenv
POSTGRES_PASSWORD=replace-with-a-strong-db-password
KEYCLOAK_ADMIN_PASSWORD=replace-with-a-strong-admin-password
```

Create `compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak -d keycloak"]
      interval: 5s
      timeout: 5s
      retries: 10

  keycloak:
    image: quay.io/keycloak/keycloak:26.8.2
    restart: unless-stopped
    command: start-dev
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

Start:

```bash
docker compose up -d
docker compose logs -f keycloak
```

Open [Keycloak Administration Console](http://localhost:8080/admin/) and sign in with `admin` and your configured password.

> `start-dev` is for local development only. Do not expose this configuration publicly without configuring production mode and HTTPS.

## Step 2. Create a municipality realm

A realm isolates its own users, roles, groups, applications, and authentication settings.

1. In the Admin Console, select the `master` realm from the top-left menu.
2. Choose **Create realm**.
3. Set **Realm name** to `demo-municipality`.
4. Leave **Enabled** on and click **Create**.

Keep `master` for Keycloak administration. Use `demo-municipality` for municipal employees.

## Step 3. Create municipal departments and roles

### Roles

Navigate to **Realm roles** > **Create role**. Create:

| Role | Purpose |
|---|---|
| `municipal-employee` | Basic employee access |
| `caseworker` | Process applications and cases |
| `department-manager` | Department management |
| `municipal-admin` | Application administration |

These are **application** roles, not Keycloak administration roles.

### Departments

Navigate to **Groups** and create this hierarchy:

```text
Demo Kommune
├── Teknik og Miljø
├── Borgerservice
└── Økonomi og Administration
```

Assign roles to groups through the group's **Role mapping** tab. For example, give `Teknik og Miljø` both `municipal-employee` and `caseworker`.

Employees can then inherit permissions from their department.

## Step 4. Create fictional municipal employees

Go to **Users** > **Add user**.

| Field | Employee 1 | Employee 2 |
|---|---|---|
| Username | `anna.jensen` | `lars.nielsen` |
| First name | Anna | Lars |
| Last name | Jensen | Nielsen |
| Email | `anna@example.test` | `lars@example.test` |
| Department | Teknik og Miljø | Borgerservice |
| Role | `caseworker` | `municipal-employee` |

For each employee:

1. Open **Credentials**.
2. Set a test password.
3. Set **Temporary** to **Off**.
4. Open **Groups** and join the correct department.
5. Ensure their role mappings match the table above. Assign the relevant roles to departments or directly to users.

## Step 5. Register the React client

Navigate to **Clients** > **Create client**.

### General settings

| Setting | Value |
|---|---|
| Client type | OpenID Connect |
| Client ID | `municipal-web` |
| Name | `Municipal employee portal` |

### Capability config

| Setting | Value |
|---|---|
| Client authentication | Off |
| Authorization | Off |
| Standard flow | On |
| Direct access grants | Off |
| Implicit flow | Off, if shown |

A browser-based React app is a **public client**. It must not hold a client secret.

### Login settings

| Setting | Value |
|---|---|
| Root URL | `http://localhost:5173` |
| Home URL | `http://localhost:5173` |
| Valid redirect URIs | `http://localhost:5173/*` |
| Valid post logout redirect URIs | `http://localhost:5173/*` |
| Web origins | `http://localhost:5173` |

Save the client. In **Advanced settings**, set the **Proof Key for Code Exchange Code Challenge Method** to `S256`, if available. This requires PKCE.

## Step 6. Configure municipal identity claims

The API needs verified information about the municipality, department, and employee permissions.

Go to **Client scopes** > **Create client scope**.

| Setting | Value |
|---|---|
| Name | `municipal-claims` |
| Type | OpenID Connect |
| Include in token scope | Off |

Open the new client scope and go to **Mappers** > **Add mapper** > **By configuration**. Create:

| Mapper type | Setting | Value |
|---|---|---|
| Hardcoded claim | Token Claim Name | `municipality_id` |
| Hardcoded claim | Claim value | `demo-kommune` |
| Group Membership | Token Claim Name | `groups` |
| Group Membership | Full group path | On |
| Audience | Included Custom Audience | `municipal-api` |

For the hardcoded claim, select JSON type **String**. Include the claims in the **access token**. Avoid exposing unnecessary group or profile information.

Attach the client scope:

1. Open **Clients** > `municipal-web`.
2. Select **Client scopes** > **Add client scope**.
3. Select `municipal-claims`.
4. Assign it as **Default**.

The Audience mapper is important. The NestJS API will verify the `aud` claim contains `municipal-api`.

### Example access token payload

After Anna logs in, selected claims should resemble:

```json
{
  "iss": "http://localhost:8080/realms/demo-municipality",
  "sub": "fictional-keycloak-user-uuid",
  "aud": ["municipal-api"],
  "azp": "municipal-web",
  "preferred_username": "anna.jensen",
  "municipality_id": "demo-kommune",
  "groups": ["/Demo Kommune/Teknik og Miljø"],
  "realm_access": {
    "roles": ["municipal-employee", "caseworker"]
  }
}
```

This is only an illustrative subset of the JWT. The actual token will contain standard claims and may include other audience or role values.

Inspect tokens under **Clients** > `municipal-web` > **Client scopes** > **Evaluate**, selecting an employee and viewing the generated access token.

## Step 7. Connect Keycloak to React

Use the official JavaScript adapter:

```bash
npm install keycloak-js
```

### Frontend `.env`

```dotenv
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=demo-municipality
VITE_KEYCLOAK_CLIENT_ID=municipal-web
```

### `src/auth/keycloak.ts`

```typescript
import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

/**
 * Starts municipal authentication with Keycloak.
 * @returns A promise that resolves after the login redirect is initiated.
 */
export function loginMunicipality(): Promise<void> {
  return keycloak.login();
}

/**
 * Logs the municipal employee out of Keycloak.
 * @returns A promise that resolves after the logout redirect is initiated.
 */
export function logoutMunicipality(): Promise<void> {
  return keycloak.logout({
    redirectUri: window.location.origin,
  });
}
```

### Initialize the adapter in `src/main.tsx`

Initialize Keycloak **before** rendering your router so it can process the OIDC callback URL:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { keycloak } from './auth/keycloak';

async function bootstrap(): Promise<void> {
  await keycloak.init({
    pkceMethod: 'S256',
    checkLoginIframe: false,
  });

  ReactDOM.createRoot(
    document.getElementById('root')!,
  ).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap().catch(console.error);
```

Keep your existing React providers and router in the render tree.

### Add a login button

```tsx
import { Button } from '@mui/material';
import {
  keycloak,
  loginMunicipality,
  logoutMunicipality,
} from './auth/keycloak';

export function MunicipalityLogin() {
  if (keycloak.authenticated) {
    return (
      <Button
        variant="outlined"
        onClick={() => void logoutMunicipality()}
      >
        Log ud af kommunalt SSO
      </Button>
    );
  }

  return (
    <Button
      variant="contained"
      onClick={() => void loginMunicipality()}
    >
      Log ind som kommunal medarbejder
    </Button>
  );
}
```

Clicking the button redirects to the Keycloak login screen. Sign in with `anna.jensen` and her test password. Keycloak redirects to React after a successful Authorization Code + PKCE flow.

## Step 8. Validate Keycloak access tokens in NestJS

Your API must validate tokens itself. Do not trust the username or roles provided directly by the frontend.

Install `jose`:

```bash
npm install jose
```

A recent Node.js version, preferably Node 24, is recommended for compatibility with current ESM packages.

### `municipal-auth.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import type { Request } from 'express';

export type MunicipalRequest = Request & {
  user?: JWTPayload;
};

const issuer =
  'http://localhost:8080/realms/demo-municipality';

const audience = 'municipal-api';

const jwks = createRemoteJWKSet(
  new URL(`${issuer}/protocol/openid-connect/certs`),
);

@Injectable()
export class MunicipalAuthGuard implements CanActivate {
  /**
   * Validates the municipal employee's bearer token.
   * @param context - Current HTTP execution context
   * @returns True when the JWT is valid
   * @throws UnauthorizedException when validation fails
   */
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<MunicipalRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice(7);

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
      });

      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired municipal token',
      );
    }
  }
}
```

The API checks signature, expiration, issuer, and intended audience. It fetches Keycloak's public signing keys from JWKS. It does not need a client secret.

Move the issuer and URLs to environment configuration when integrating into your project.

### `municipal.controller.ts`

```typescript
import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  MunicipalAuthGuard,
  type MunicipalRequest,
} from './municipal-auth.guard';

@Controller('municipal')
@UseGuards(MunicipalAuthGuard)
export class MunicipalController {
  /**
   * Returns the authenticated municipal employee's claims.
   * @param request - Verified employee request
   * @returns Employee identity and organisation details
   */
  @Get('me')
  getProfile(@Req() request: MunicipalRequest) {
    const user = request.user!;

    const realmAccess = user.realm_access as
      | { roles?: string[] }
      | undefined;

    return {
      id: user.sub,
      username: user.preferred_username,
      municipalityId: user.municipality_id,
      groups: user.groups ?? [],
      roles: realmAccess?.roles ?? [],
    };
  }

  /**
   * Checks whether the employee can access municipal cases.
   * @param request - Verified employee request
   * @returns A confirmation when access is permitted
   */
  @Get('cases')
  getCases(@Req() request: MunicipalRequest) {
    const realmAccess = request.user?.realm_access as
      | { roles?: string[] }
      | undefined;

    const roles = realmAccess?.roles ?? [];

    if (!roles.includes('caseworker')) {
      throw new ForbiddenException(
        'Caseworker permission required',
      );
    }

    return { message: 'Access granted' };
  }
}
```

Register the controller and guard in a NestJS module:

```typescript
@Module({
  controllers: [MunicipalController],
  providers: [MunicipalAuthGuard],
})
export class MunicipalModule {}
```

Import `MunicipalModule` in the application module. Make sure NestJS CORS configuration allows `http://localhost:5173`.

### React API call: `src/auth/municipal-api.ts`

```typescript
import { keycloak } from './keycloak';

/**
 * Retrieves the authenticated municipal employee's profile.
 * @returns The employee's validated identity information
 */
export async function getMunicipalProfile() {
  await keycloak.updateToken(30);

  const response = await fetch(
    'http://localhost:3000/municipal/me',
    {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Municipal API request failed: ${response.status}`,
    );
  }

  return response.json();
}
```

Call `getMunicipalProfile()` after Keycloak indicates that the employee is authenticated.

## Step 9. Demonstrate Single Sign-On across two applications

SSO means the employee signs in to one application, then accesses a second application without entering credentials again while the identity-provider session remains active.

Create another Keycloak client:

| Setting | Value |
|---|---|
| Client ID | `municipal-intranet` |
| Client authentication | Off |
| Standard flow | On |
| Valid redirect URIs | `http://localhost:5174/*` |
| Valid post logout redirect URIs | `http://localhost:5174/*` |
| Web origins | `http://localhost:5174` |
| PKCE method | `S256` |

Run another local instance of the React app on port 5174 with the alternative client ID:

```bash
VITE_KEYCLOAK_CLIENT_ID=municipal-intranet \
npm run dev -- --port 5174
```

**SSO test:**

1. Open `http://localhost:5173` and select municipality login.
2. Sign in with Anna's credentials in Keycloak.
3. Open `http://localhost:5174` in another tab in the same browser.
4. Select municipality login in the second application.
5. Keycloak should recognize its existing session and return to the second application without asking for the password again.

The two clients share a Keycloak SSO session but receive tokens associated with their own client IDs.

## Step 10. Test permissions

- [ ] **Anna signs in:** `anna.jensen` can log in.
- [ ] **Anna can access cases:** `GET /municipal/cases` returns `200 OK`.
- [ ] **Lars signs in:** `lars.nielsen` can log in.
- [ ] **Lars cannot access cases:** `GET /municipal/cases` returns `403 Forbidden`.
- [ ] **Missing token:** `GET /municipal/me` without a token returns `401 Unauthorized`.
- [ ] **Wrong audience:** A valid JWT without `municipal-api` in `aud` returns `401 Unauthorized`.

These checks assume the role assignments from Step 3 are correct.

## Integrating alongside Signicat

Keep your existing Signicat integration as an independent authentication source:

| Login option | Identity provider | User type |
|---|---|---|
| MitID Private | Signicat | Citizen |
| MitID Erhverv | Signicat | Business representative |
| Kommunalt SSO | Keycloak | Municipal employee |

In NestJS, keep verification logic for the two identity providers separate. Do not validate a Signicat token through the Keycloak guard, or the reverse.

For the application's internal identity model, use the **issuer plus subject** (`iss` + `sub`) as an external identity key. Do not assume usernames or email addresses are unique across identity providers.

## Limitations and next steps

This is a local corporate-style SSO prototype, not an actual KOMBIT or NemLog-in federation. Start by getting employee login, JWT verification, and role checks working. You can later customize the Keycloak login theme and model more municipality departments and permissions.

For production-style architecture, also consider secure token storage, CSRF/XSS protection, refresh and logout behavior, stricter redirect allowlists, HTTPS, and separate authorization checks for every protected API operation.

## References

- [Keycloak Docker getting started](https://www.keycloak.org/getting-started/getting-started-docker)
- [Keycloak JavaScript adapter](https://www.keycloak.org/securing-apps/javascript-adapter)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [KOMBIT: Become your own Identity Provider](https://www.digitaliseringskataloget.dk/bliv-din-egen-identity-provider-idp)
