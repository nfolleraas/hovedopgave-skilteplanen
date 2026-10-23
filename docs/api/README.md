# API documentation

Project specific documentation for the NestJS API belongs in this folder.
Keep it focused on the API; repository-wide setup and commands are in the
[root README](../../README.md).

## App overview

The API is a NestJS and TypeScript app in [`apps/api/`](../../apps/api/). Its
bootstrap code is [`src/main.ts`](../../apps/api/src/main.ts), which applies
the global `/api` route prefix and listens on port `3000` by default. The
current `GET /api` route returns a greeting. The web app's Vite server proxies
`/api` requests to this service during development.

The API can connect to the development PostgreSQL service at hostname `db`
using `DATABASE_URL`; the connection details and container setup are described
in [DEVCONTAINER.md](../../DEVCONTAINER.md). The API does not currently use the
database.

## Common commands

Run these from the repository root:

```bash
bun run --filter api dev
bun run --filter api build
bun run --filter api test
bun run --filter api test:e2e
bun run --filter api lint
```

The generated NestJS starter README is at
[`apps/api/README.md`](../../apps/api/README.md). The root README is the source
for shared development instructions.
