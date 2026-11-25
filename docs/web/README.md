# Web app documentation

Project specific documentation for the React frontend belongs in this folder.
Keep it focused on the web app; repository-wide setup and commands are in the
[root README](../../README.md).

## App overview

The frontend is a React 19 and TypeScript app served by Vite. Its source is in
[`apps/web/src/`](../../apps/web/src/), and Vite's configuration is in
[`apps/web/vite.config.ts`](../../apps/web/vite.config.ts). In the dev
container, Vite listens on port `5173` and proxies `/api` requests to the API on
port `3000`.

The [routing guide](routing.md) explains how URLs map to page components and
how to register and link to new paths.

The [stylesheet](styles/stylesheet.md) documents the colours, typography, and
component styles to use when implementing the UI.

The [accessibility requirements](accessibility.md) define the minimum standard
for accessible pages and components, including screen readers, keyboard-only
navigation, visual accessibility, and clear language for non-technical users.

## Common commands

Run these from the repository root:

```bash
bun run --filter web dev
bun run --filter web build
bun run --filter web lint
```

## Tests

| Command from `apps/web` | Coverage |
| --- | --- |
| `bun run test:unit` | Vitest unit and React integration tests, plus Bun unit tests |
| `bun run test:e2e` | Playwright tests for road permits |
| `bun run test:e2e:applicants` | Playwright tests for applicant creation and profile editing |
| `bun run test:ui` | Interactive Playwright runner |
| `bun run test` | Unit tests and both Playwright suites |

From the repository root, add `--filter web` after `bun run`.

Frontend tests live in [`apps/web/tests/`](../../apps/web/tests/). The Vitest
tests for road permits and their map tools are in
[`roadpermit/`](../../apps/web/tests/roadpermit/). They use simulated DOM
interactions, with permit submission and map service responses mocked.

The Playwright tests in [`roadpermit/e2e/`](../../apps/web/tests/roadpermit/e2e/)
run Vite and the API against `DATABASE_URL` from `.devcontainer/.env`. The tests
create and submit applications in that database. The dev container installs
Chromium and its system dependencies on creation and caches the browser in the
`playwright-browsers` Docker volume. Rebuild an existing dev container to pick up
this setup, then run the following from the repository root inside the container:

```bash
bun run --filter api db:generate
bun run --filter api db:deploy
bun run --filter api db:seed
bun run --filter web test:e2e
```

Playwright starts the web app on port `4173` and the API on port `4300`.
The tests supply fixture responses for the external address and map services.

For interactive testing, run `bun run --filter web test:ui` and open the
**Playwright UI** address from the VS Code Ports panel in Chrome. The default
host address is [http://127.0.0.1:9323](http://127.0.0.1:9323).

The app's generated starter README is at
[`apps/web/README.md`](../../apps/web/README.md). The root README is the source
for shared development instructions.

## Applicant browser tests

Install Chromium once from the web workspace:

```sh
cd apps/web
bun run playwright install --with-deps chromium
```

Run the suite from the repository root:

```sh
bun run --filter web test:e2e:applicants
```

If the test ports are occupied, set `PLAYWRIGHT_API_PORT` and
`PLAYWRIGHT_WEB_PORT` to free local ports.

The suite uses ports `5190` and `3190`. It requires a PostgreSQL connection
through `DATABASE_URL` with permission to create databases. It applies the
project migrations to a temporary database, starts the real API, and drops the
database after the run. Address suggestions use a fixed fixture so the tests
do not depend on the external address service.
