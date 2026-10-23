# Repository guidance

This repository is a Danish 5th-semester Datamatiker project for Skilteplanen. It contains a React 19 + TypeScript/Vite frontend in `apps/web`, a NestJS + TypeScript API in `apps/api`, and a PostgreSQL development service in the dev container.

## Working agreements

- Read the relevant app documentation and nearby code before changing behavior. Use `DEVCONTAINER.md` for container setup changes.
- Keep changes focused and follow the existing TypeScript, React, NestJS, and Biome conventions.
- Run commands from the repository root unless an app-specific command is needed. Use Bun workspaces; do not introduce another package manager or lockfile.
- `bun run check` runs Biome checks. `bun run check:fix` writes safe fixes. App scripts and database/container commands are documented in `README.md` and `DEVCONTAINER.md`.
- API unit and e2e tests are defined in `apps/api`; the web app currently has no test script. Run relevant checks for code changes and report what was run.
- Do not commit secrets, local environment files, generated build output, or dependency directories.
- For commits, preserve the configured Git author and do not add Codex as an author or co-author, or add attribution trailers, unless explicitly requested.
- Keep this file short and repository-wide. Put detailed, task-specific procedures in skills or documentation and link them here only when useful.

## Project map

- `apps/web/`: React frontend, Vite development server, and Biome configuration inherited from the root.
- `apps/api/`: NestJS API and Vitest unit/e2e tests.
- `.devcontainer/` and `DEVCONTAINER.md`: development environment and its documentation.
- `.agents/skills/`: repository-specific reusable agent workflows.
- `.codex/`: Codex project configuration and hook implementation files.
- `docs/agents/`: documentation about this repository's agent setup.
