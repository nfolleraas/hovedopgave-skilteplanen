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

## Temporary feature placeholders

Contact persons are implemented in a separate branch. Actor forms must allow
saving without contact details or availability, and the active submission
mapper omits contact-person data. The API temporarily creates a placeholder
contact person for each non-private actor. Keep the placeholder shapes until
that feature is integrated.

Road-permit step 4, **Aktør**, embeds the actor list and create/edit dialogs.
Actors are saved immediately against the draft's actual case number and loaded
with the API's `caseNumber` filter. Actors are optional, and the summary displays
any saved actors. The first actor supplies the legacy contact fields in the
submission payload until that contract changes; an empty list sends blank fields.

## Common commands

Run these from the repository root:

```bash
bun run --filter web dev
bun run --filter web build
bun run --filter web lint
bun run --filter web test:e2e
```

## Tests

| Command from `apps/web` | Coverage |
| --- | --- |
| `bun run test:unit` | Vitest unit and React integration tests |
| `bun run test:e2e` | Playwright end-to-end tests |
| `bun run test:ui` | Interactive Playwright runner |
| `bun run test` | Both suites, starting with Vitest |

From the repository root, add `--filter web` after `bun run`.

Vitest discovers `*.test.ts` and `*.test.tsx` files under both
[`apps/web/src/`](../../apps/web/src/) and
[`apps/web/tests/`](../../apps/web/tests/). The unit and integration tests
use Vitest imports and assertions. The tests for road permits and their map tools are in
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

## Browser tests

Playwright runs the browser suite in desktop Chromium and mobile Chromium
(Pixel 7 emulation). Install the browser once after `bun install`:

```bash
bun run --cwd apps/web playwright install --with-deps chromium
bun run --filter web test:e2e
bun run --cwd apps/web test:ui
```

The suite starts its own Vite server on `127.0.0.1:4173`; leave that port free.
It covers navigation, keyboard skip navigation, Danish and English language
detection and fallback, actor details, validation, editing, deletion, and
recovery from API errors. Actor API responses are intercepted in the browser,
while each actor test opens a real application draft from the overview and
uses step 4. The test servers therefore require the development API and
database. Address and company lookups use fixture responses. These tests do
not verify actor persistence or external integrations.

Actor tests live in
[`apps/web/tests/actors/`](../../apps/web/tests/actors/), with separate
tests for creating, updating, and deleting an actor. Navigation tests live in
[`apps/web/tests/navigation/`](../../apps/web/tests/navigation/), and configuration is in
[`playwright.config.ts`](../../apps/web/playwright.config.ts). The test server
starts Vite directly to avoid rewriting translation catalogs via `dev`.
Run `bun run --filter web locale:check` separately to verify extracted keys
against the catalogs and parser configuration.

After a run, open the HTML report with:

```bash
bun run --cwd apps/web playwright show-report
```

Reports and failure screenshots/traces are ignored by Git.

The app's generated starter README is at
[`apps/web/README.md`](../../apps/web/README.md). The root README is the source
for shared development instructions.
