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

The API connects to the development PostgreSQL service at hostname `db` using
`DATABASE_URL`; the connection details and container setup are described in
[DEVCONTAINER.md](../../DEVCONTAINER.md). Prisma models, migrations, and
development seeders live under [`apps/api/prisma/`](../../apps/api/prisma/).

## Common commands

Run these from the repository root:

```bash
bun run --filter api dev
bun run --filter api build
bun run --filter api test
bun run --cwd apps/api test:api
bun run --filter api lint
```

The generated NestJS starter README is at
[`apps/api/README.md`](../../apps/api/README.md). The root README is the source
for shared development instructions.

## API integration tests

`bun run --cwd apps/api test:api` runs files named `*.api-spec.ts` to test API
endpoints and their integration with services and the database. Database tests
require PostgreSQL with the committed migrations applied and `DATABASE_URL`
configured in the development environment. Run these commands from the
repository root:

```bash
bun run --cwd apps/api db:deploy
bun run --cwd apps/api test:api
```

Database tests should create and clean up their own fixtures so they can run
independently of development seed data. The backend CI job provisions
PostgreSQL and applies migrations before running the API integration suite.

## Guides

- [Modules and seeders](modules-and-seeders.md): feature module structure,
  dependency injection, root-module registration, and generic Prisma seeder
  examples.
