# Repository guidance

This repository is a Danish 5th-semester Datamatiker project for Skilteplanen. It contains a React 19 + TypeScript/Vite frontend in `apps/web`, a NestJS + TypeScript API in `apps/api`, and a PostgreSQL development service in the dev container.

## Working agreements

- Read the relevant app documentation and nearby code before changing behavior. Use `DEVCONTAINER.md` for container setup changes.
- Before implementing or changing web UI components, read and follow the [web stylesheet](docs/web/styles/stylesheet.md), including its component-specific variants.
- All frontend pages must follow the [accessibility guidelines](docs/web/accessibility.md).
- Keep changes focused and follow the existing TypeScript, React, NestJS, and Biome conventions.
- For simple requests, make the smallest possible change that fully satisfies the request. Do not add unrequested features, refactors, abstractions, or broad testing. Keep verification proportional to the change; reserve larger implementations for complicated problems or explicitly requested scope.
- Run commands from the repository root unless an app-specific command is needed. Use Bun workspaces; do not introduce another package manager or lockfile.
- Run all Bun commands from `/workspaces/hovedopgave-skilteplanen`. Use `bun run <script>` for root scripts and `bun run --cwd apps/web <script>` or `bun run --cwd apps/api <script>` for app scripts. Do not introduce another package manager or lockfile.
- In a managed coding-agent sandbox, Bun 1.4.4 may report `Script not found` or `No package.json found`, or crash while reading a valid manifest. Retry the exact Bun command with sandbox escalation; do not bypass the package script or treat these messages as a repository configuration error unless the escalated command also fails.
- `bun run check` runs Biome checks. `bun run check:fix` writes safe fixes. App scripts and database/container commands are documented in `README.md` and `DEVCONTAINER.md`.
- In `apps/web`, use `bun run test:unit` for Vitest, `bun run test:e2e` for Playwright, `bun run test:ui` for Playwright UI mode, and `bun run test` for both suites. The contact-person tests under `src/` use `bun run test:bun` (`bun test` with happy-dom). The API test scripts are documented in `README.md`. Run relevant checks for code changes and report what was run.
- In the API, inject `PrismaService` only into repository classes, and normally keep one class per source file. See `docs/api/modules.md`.
- Do not commit secrets, local environment files, generated build output, or dependency directories.
- For commits, preserve the configured Git author and do not add Codex as an author or co-author, or add attribution trailers, unless explicitly requested.
- Keep this file short and repository-wide. Put detailed, task-specific procedures in skills or documentation and link them here only when useful.

## Secret & environment-file safety

- Never access `.env` files or any secret-bearing environment file. No reading, printing, copying, moving, or inspecting them.
- Searches, listings, and diagnostics must not risk exposing their contents.
- Never echo or hardcode credentials, tokens, API keys, or connection strings anywhere (output, source code, commits, etc.).
- `.env.example` files are the only permitted templates/references.
- If a task genuinely needs a secret, you stop and ask me for a safe, redacted alternative rather than working around it.

## Project map

- `apps/web/`: React frontend, Vite development server, and Biome configuration inherited from the root.
- `apps/api/`: NestJS API and Vitest unit/e2e tests.
- `.devcontainer/` and `DEVCONTAINER.md`: development environment and its documentation.
- `.agents/skills/`: repository-specific reusable agent workflows.
- `.codex/`: Codex project configuration and hook implementation files.
- `docs/agents/`: documentation about this repository's agent setup.
