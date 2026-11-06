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

## Common commands

Run these from the repository root:

```bash
bun run --filter web dev
bun run --filter web build
bun run --filter web lint
```

The app's generated starter README is at
[`apps/web/README.md`](../../apps/web/README.md). The root README is the source
for shared development instructions.
