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

## Map configuration

Copy [`apps/web/.env.example`](../../apps/web/.env.example) to
`apps/web/.env.local`, set `VITE_DATAFORSYNINGEN_TOKEN` to your own
[Dataforsyningen token](https://dataforsyningen.dk/), and restart Vite.
The token is used in browser requests and is visible to visitors.
The usage-details iframe loads Leaflet 1.9.4 from unpkg and requests WMS tiles
from `https://api.dataforsyningen.dk/forvaltning2` using the `Basis_kort`,
`Vejnavne_basiskort`, and `Stednavne_basiskort` layers. Without a token, it
shows an unavailable-map message. This displays a map; it does not save a location.

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
