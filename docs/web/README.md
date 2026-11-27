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

Feature guides, such as [contact persons](../features/contact-persons.md), are
in [`docs/features/`](../features/). The
[placeholder guide](../features/placeholders.md) explains which parts are
temporary and how to replace them.

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
bun run --filter web test
bun run --filter web test:bun
```

## Tests

| Command from `apps/web` | Coverage |
| --- | --- |
| `bun run test:unit` | Vitest unit and React integration tests |
| `bun run test:e2e` | Playwright end-to-end tests |
| `bun run test:ui` | Interactive Playwright runner |
| `bun run test` | Both suites, starting with Vitest |
| `bun run test:bun` | Contact-person tests under `src/`, run with `bun test` and happy-dom |

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
