# Project file structure

This document describes the main files and folders in the Skilteplanen
repository. Generated output, dependency directories, and local runtime data
are intentionally omitted from the overview.

## Repository overview

```text
.
├── .agents/                  Reusable agent skills and workflows
├── .codex/                   Project-scoped Codex configuration and rules
├── .devcontainer/            Development container and service setup
├── apps/
│   ├── api/                  NestJS API and Prisma integration
│   └── web/                  React, TypeScript, and Vite frontend
├── docs/                     Project documentation
├── .env.example              Example local environment variables
├── AGENTS.md                 Repository guidance for coding agents
├── DEVCONTAINER.md           Detailed development-container documentation
├── biome.json                Shared Biome formatter and linter configuration
├── bun.lock                 Workspace dependency lockfile
├── package.json              Bun workspace and root scripts
└── tsconfig.base.json        Shared TypeScript compiler settings
```

## Agent configuration

```text
.agents/
└── skills/                   Reusable repository workflows

.codex/
├── config.toml               Project approval and sandbox defaults
├── rules/default.rules       Git command approval and safety rules
├── hooks/README.md           Guidance for project hooks
└── README.md                 Codex project-configuration notes
```

Project-local Codex configuration is loaded only when the repository is
trusted. The devcontainer seeds a new Codex home from `.codex/config.toml`.

## Development container

```text
.devcontainer/
├── compose.yaml              App, PostgreSQL, and pgweb services
├── devcontainer.json         VS Code Dev Container configuration
├── devcontainer-lock.json    Locked container feature versions
├── post-create-command.sh     First-start setup and dependency installation
└── setup-zsh.sh              Zsh plugin and shell setup
```

The `app` service contains the repository and development tools. PostgreSQL is
provided by `db`, while `pgweb` provides a browser-based database client.

## Applications

### API: `apps/api/`

```text
apps/api/
├── prisma/
│   ├── migrations/            Committed database migrations
│   ├── schema.prisma          Prisma data model
│   └── seed.ts                Development seed entry point
├── src/
│   ├── config/                Application, authentication, and CORS config
│   ├── modules/
│   │   ├── applicants/        Applicant controller, service, repository, DTOs
│   │   └── auth/              Authentication controller, service, DTOs
│   ├── prisma/                Prisma NestJS module and service
│   ├── app.controller.ts      Root API controller
│   ├── app.module.ts          Root NestJS module
│   ├── app.service.ts         Root API service
│   └── main.ts                API bootstrap and HTTP configuration
├── test/                      API end-to-end tests
├── openapi.json               OpenAPI document
├── package.json               API scripts and dependencies
└── vitest.config*.ts          Unit and end-to-end test configuration
```

API modules are organized by business capability. A module's controller,
service, repository, DTOs, and mappers stay together under its module folder.

### Web: `apps/web/`

```text
apps/web/
├── public/                    Static files served without bundling
├── src/
│   ├── api/                   API clients, generated API files, and mappers
│   ├── app/                   Application shell, providers, and router
│   ├── assets/                Imported images and other bundled assets
│   ├── components/            Reusable layout and UI components
│   ├── config/                Frontend environment configuration
│   ├── context/               React context providers
│   ├── hooks/                 Reusable React hooks
│   ├── lib/                   Shared library integrations
│   ├── pages/                 Route-level page components and tests
│   ├── types/                 Shared frontend and API types
│   ├── utils/                 Small shared utilities
│   ├── App.tsx                Legacy/root application component
│   ├── index.css              Global styles
│   └── main.tsx               Frontend bootstrap
├── index.html                 Vite HTML entry point
├── package.json               Web scripts and dependencies
└── vite.config.ts             Vite configuration
```

Feature-specific files should live close to the feature, while reusable UI
building blocks belong under `src/components/`.

## Documentation

```text
docs/
├── agents/                    Agent setup documentation
├── api/                       API documentation
└── technical/                Cross-cutting engineering documentation
    ├── coding-convention.md   Coding and formatting conventions
    └── file-structure.md      This file
```

Update this document when a new top-level application, major shared folder, or
development workflow is introduced.
