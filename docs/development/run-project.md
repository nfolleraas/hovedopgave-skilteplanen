# Run the project

This guide covers the normal development workflow for the web app and API.
Detailed API feature, Prisma, and seeder guidance is kept in the [API
documentation](../api/README.md).

## Start the web app and API

The normal development workflow starts both applications together. Run this
from the repository root:

```bash
bun run dev
```

The root `dev` script starts each workspace's `dev` script. The web app runs
through Vite and the API runs through NestJS in watch mode.

You can also start both applications through VS Code:

1. Open the Command Palette with `Ctrl+Shift+P`.
2. Choose **Tasks: Run Task**.
3. Select **Dev: web + API**.

That task starts **Web: dev** and **API: dev** in parallel. The task name and
its commands are defined in [`.vscode/tasks.json`](../../.vscode/tasks.json).

During development, open the forwarded web port from VS Code's **Ports** panel.
The Vite development server proxies `/api` requests to the API, so the browser
can use the web app's origin while the API runs separately.

## Start one application

Run these commands from the repository root when only one application is
needed:

```bash
bun run --filter web dev
bun run --filter api dev
```

The API-only command starts NestJS watch mode. The web-only command starts the
Vite development server.

## Build and validate

Run workspace commands from the repository root with a filter:

```bash
bun run --filter web build
bun run --filter api build
bun run --filter api test
bun run --filter api test:e2e
bun run check
```

The API build generates Prisma Client before compiling NestJS. It does not
create or apply database migrations.

## Prisma commands

Run Prisma scripts from the API workspace, not through the root workspace
filter. Prisma configuration paths such as `prisma`, `prisma/migrations`, and
`prisma/seed.ts` are resolved relative to `apps/api`:

```bash
cd apps/api

bun run db:format
bun run db:generate
bun run db:migrate
bun run db:seed
```

Use `db:deploy` for applying already-committed migrations in deployment or CI
environments. Use `db:reset` only when intentionally rebuilding the local
development database, because it destroys local database data.

See [API modules and seeders](../api/modules-and-seeders.md) for the complete
Prisma script reference, migration guidance, and seeder instructions.

## Database and environment

The development container provides PostgreSQL and the API receives its
connection string through `DATABASE_URL`. Start or rebuild the development
container before running database-dependent commands if the database service is
not available.

For container setup, ports, environment variables, and database connection
details, see [DEVCONTAINER.md](../../DEVCONTAINER.md).
