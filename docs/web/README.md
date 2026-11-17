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

The app currently contains the default Vite and React starter screen. Add
feature-specific guides here as the frontend develops.

The [stylesheet](styles/stylesheet.md) documents the colours, typography, and
component styles to use when implementing the UI.

The [accessibility requirements](accessibility.md) define the minimum standard
for accessible pages and components, including screen readers, keyboard-only
navigation, visual accessibility, and clear language for non-technical users.

## Temporary feature placeholders

Until the application feature is merged, actor creation without a case number
in the route uses the seeded application `DEMO-2026-0001`. An explicit route
case number takes precedence. The application must exist in the database;
API errors must still be reported if the seed is missing.

Contact persons are implemented in a separate branch. Actor forms must allow
saving without contact details or availability, and the active submission
mapper omits contact-person data. Keep the placeholder shapes until that
feature is integrated.

## Common commands

Run these from the repository root:

```bash
bun run --filter web dev
bun run --filter web build
bun run --filter web lint
bun run --filter web test:e2e
```

## Browser tests

Playwright runs the browser suite in desktop Chromium and mobile Chromium
(Pixel 7 emulation). Install the browser once after `bun install`:

```bash
bun run --cwd apps/web playwright install --with-deps chromium
bun run --filter web test:e2e
bun run --filter web test:e2e:ui
```

The suite starts its own Vite server on `127.0.0.1:4173`; leave that port free.
It covers navigation, keyboard skip navigation, Danish and English language
detection and fallback, actor details, validation, editing, deletion, and
recovery from API errors. Actor API responses are intercepted in the browser,
so these frontend tests need no running API, database, or external address
service. They do not verify backend persistence or external integrations.

Tests live in [`apps/web/e2e/`](../../apps/web/e2e/) and configuration in
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
