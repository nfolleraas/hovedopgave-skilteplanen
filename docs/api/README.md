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

Swagger is available at `/swagger` only when the API runs with
`NODE_ENV=development`. It is not registered in test or production
environments.

The API connects to the development PostgreSQL service at hostname `db` using
`DATABASE_URL`; the connection details and container setup are described in
[DEVCONTAINER.md](../../DEVCONTAINER.md). Prisma models, migrations, and
development seeders live under [`apps/api/prisma/`](../../apps/api/prisma/).

## Common commands

Run these from the repository root:

```bash
bun run --cwd apps/api dev
bun run --cwd apps/api build
bun run --cwd apps/api test
bun run --cwd apps/api test:e2e
bun run --cwd apps/api lint
```

The generated NestJS starter README is at
[`apps/api/README.md`](../../apps/api/README.md). The root README is the source
for shared development instructions.

## Guides

- [Modules](modules.md): feature structure, dependency injection,
  repositories, Prisma, and migrations.
- [Seeders](seeders.md): repeatable development data and seeder registration.
