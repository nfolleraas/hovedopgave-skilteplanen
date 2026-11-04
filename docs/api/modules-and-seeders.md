# API modules and seeders

This guide describes the recommended way to add a business feature to the
NestJS API and to add development data for it. Examples use generic names and
placeholder values so they can be copied without coupling the documentation to
one domain feature.

## Generate a module

Start a new feature module with the NestJS resource generator:

```bash
cd apps/api

bunx nest g resource modules/module-name
```

Choose the resource options that match the feature. The generated resource is
the source of truth for naming classes, files, methods, and functions. Keep the
generated `PascalCase` class names and the `camelCase` method names consistent
with the module name.

The generator creates an `entities/` folder. This project does not use that
folder because Prisma models are the source of truth for database entities.
Delete the generated `entities/` folder and its files before continuing.

After generation, register the generated module in the root
[`AppModule`](../../apps/api/src/app.module.ts) if the generator has not done
so already.

## Module structure

Each business capability belongs in its own folder under
[`apps/api/src/modules/`](../../apps/api/src/modules/). Keep the files that
implement the capability together:

```text
apps/api/src/modules/<feature>/
├── <feature>.controller.ts       HTTP routes and request parameters
├── <feature>.module.ts            NestJS dependency-injection boundary
├── <feature>.repository.ts       Prisma queries for the feature
├── <feature>.service.ts           Business rules and orchestration
└── dto/
    ├── create-<feature>.dto.ts    Request body for create operations
    └── update-<feature>.dto.ts    Request body for update operations
```

The generated resource may include additional files, such as a spec file or an
`entities/` folder. Keep the spec file when tests are needed, but remove
`entities/` as described above. Add only the other files the feature needs. For
example, a read-only feature may not need create or update DTOs. Tests should be
placed next to the file they test, using the repository's existing test
conventions.

### Create the module

The module declares the controller and the providers that Nest must be able to
inject. A repository is a provider because the service depends on it:

```ts
import { Module } from '@nestjs/common';
import { ModuleNameController } from './module-name.controller.js';
import { ModuleNameRepository } from './module-name.repository.js';
import { ModuleNameService } from './module-name.service.js';

@Module({
  controllers: [ModuleNameController],
  providers: [ModuleNameService, ModuleNameRepository],
})
export class ModuleNameModule {}
```

If the feature consumes a provider from another module, import that module. If
another module needs to consume a provider from this feature, export the
provider explicitly:

```ts
@Module({
  imports: [SharedModule],
  controllers: [ModuleNameController],
  providers: [ModuleNameService, ModuleNameRepository],
  exports: [ModuleNameService],
})
export class ModuleNameModule {}
```

### Implement the layers

The controller should translate HTTP requests into service calls. Keep business
rules out of the controller:

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateModuleNameDto } from './dto/create-module-name.dto.js';
import { ModuleNameService } from './module-name.service.js';

@Controller('module-names')
export class ModuleNameController {
  constructor(private readonly moduleNameService: ModuleNameService) {}

  @Post()
  create(@Body() dto: CreateModuleNameDto) {
    return this.moduleNameService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.moduleNameService.findOne(id);
  }
}
```

The service coordinates validation and business behavior. The repository owns
the Prisma calls, which keeps database details out of the service and makes
both layers easier to test independently:

```ts
// module-name.service.ts
import { Injectable } from '@nestjs/common';
import { ModuleNameRepository } from './module-name.repository.js';
import { CreateModuleNameDto } from './dto/create-module-name.dto.js';

@Injectable()
export class ModuleNameService {
  constructor(private readonly moduleNameRepository: ModuleNameRepository) {}

  create(dto: CreateModuleNameDto) {
    return this.moduleNameRepository.create({
      label: dto.label,
    });
  }

  findOne(id: string) {
    return this.moduleNameRepository.findById(id);
  }
}
```

```ts
// module-name.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ModuleNameRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ModuleNameCreateInput) {
    return this.prisma.moduleName.create({ data });
  }

  findById(id: string) {
    return this.prisma.moduleName.findUniqueOrThrow({ where: { id } });
  }
}
```

Use the generated Prisma types that match the model in the project. The
`ModuleName` model above is illustrative; replace it with the model for the
feature being implemented while preserving the naming convention generated by
Nest.

### Register the module

Creating a module file does not make it part of the application. Import it in
the root [`AppModule`](../../apps/api/src/app.module.ts):

```ts
import { ModuleNameModule } from './modules/module-name/module-name.module.js';

@Module({
  imports: [PrismaModule, ModuleNameModule],
})
export class AppModule {}
```

Keep shared infrastructure modules, such as the Prisma module, in `imports`
when the feature requires them. The route is then available below the global
API prefix configured by [`main.ts`](../../apps/api/src/main.ts), for example
`POST /api/features`.

## Prisma

Prisma is the API's type-safe database layer. The general flow is:

```text
Prisma schema files
        │
        ├── prisma generate ──> generated Prisma Client
        │                         └── used by PrismaService and seeders
        │
        └── prisma migrate dev ──> SQL migration in prisma/migrations/
                                      └── applied to the development database
```

### Prisma files

The Prisma setup is located under [`apps/api/prisma/`](../../apps/api/prisma/):

```text
apps/api/
├── prisma/
│   ├── domain/                 Prisma models, split by domain concept
│   ├── enums/                  Shared Prisma enums
│   ├── migrations/             Versioned SQL migrations
│   ├── schema.prisma           Generator and PostgreSQL datasource settings
│   ├── seed.ts                 Seed entry point
│   └── seeders/                One seeder file per logical dataset
├── prisma7.config.ts           Prisma CLI paths, datasource, and seed command
└── src/
    ├── generated/prisma/       Generated Prisma Client; do not edit manually
    └── modules/prisma/
        ├── prisma.module.ts    Global NestJS module
        └── prisma.service.ts   NestJS-managed Prisma Client
```

`schema.prisma` is the entry point for the Prisma schema. This project uses a
multi-file schema, so add models in the appropriate file under `prisma/domain/`
and shared enums under `prisma/enums/`; do not put feature models into NestJS's
generated `entities/` folder. Prisma reads the complete `prisma/` schema
directory through [`prisma7.config.ts`](../../apps/api/prisma7.config.ts).

The generator in `schema.prisma` writes the generated client to
[`apps/api/src/generated/prisma/`](../../apps/api/src/generated/prisma/). The
generated files are implementation output: never edit them directly. Change a
Prisma model or enum, then regenerate the client.

### Add or change a model

A typical model contains an identifier, fields, relationships, and indexes or
unique constraints required by the application:

```prisma
model ModuleName {
  id        String   @id @default(uuid())
  key       String   @unique
  label     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Use the existing schema conventions for IDs, timestamps, relation names,
optional fields, and deletion behavior. A `@unique` field is especially useful
for idempotent seeders and `findUnique` queries. If a model references another
model, define both relation fields and the foreign-key field explicitly where
that is the convention for the surrounding domain.

After changing a schema file, format and generate the client, then create a
development migration:

```bash
cd apps/api
bun run db:format
bun run db:generate
bun run db:migrate
```

The migration command compares the Prisma schema with the development
database, creates a timestamped folder under `prisma/migrations/`, writes SQL,
applies it, and regenerates the client. Review the generated SQL and any
warnings before committing the migration.

### PrismaService and dependency injection

[`PrismaService`](../../apps/api/src/modules/prisma/prisma.service.ts) extends
the generated `PrismaClient`. It reads `DATABASE_URL`, creates the PostgreSQL
adapter, connects during Nest's module initialization, and disconnects during
module shutdown:

```ts
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

[`PrismaModule`](../../apps/api/src/modules/prisma/prisma.module.ts) is marked
`@Global()`, provides `PrismaService`, and exports it. Feature repositories can
therefore inject the one application-managed client:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ModuleNameRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.moduleName.findMany();
  }
}
```

Do not create a new `PrismaClient` inside a controller, service, or repository.
Using `PrismaService` gives Nest control over the connection lifecycle and
avoids unnecessary database connections. Seeders are separate CLI programs and
therefore create their own client in [`prisma/seed.ts`](../../apps/api/prisma/seed.ts).

### Migrations

Migrations are committed, ordered descriptions of database changes. A
migration folder contains the SQL Prisma generated from a schema change:

```text
apps/api/prisma/migrations/
└── 20260101090000_add_module_name/
    └── migration.sql
```

Use `db:migrate` while developing locally. It is intended to create a new
migration and apply pending migrations to the development database. Use
`db:deploy` in an environment where migrations already exist and must simply be
applied, such as a deployment or CI job. It does not create a new migration.

Never edit an already-applied migration to change its meaning. Create a new
schema change and a new migration instead. If the generated migration contains
data-loss warnings, stop and verify the data or choose a safer multi-step
migration before applying it.

### Prisma scripts

The scripts below are defined in [`apps/api/package.json`](../../apps/api/package.json).
Run them from `apps/api`. Do not rely on the workspace-filter form from the
repository root for Prisma commands; Prisma's relative configuration and schema
paths are resolved more reliably from the API workspace.

| Script | What it does | When to use it |
| --- | --- | --- |
| `db:format` | Formats the Prisma schema files. | After editing `.prisma` files or before reviewing a schema change. |
| `db:generate` | Generates the type-safe Prisma Client into `src/generated/prisma/`. | After changing the schema, before TypeScript code uses the new model or enum. The API `build` script runs this automatically. |
| `db:seed` | Runs the seed command configured in `prisma7.config.ts`, which executes `prisma/seed.ts` and all registered seeders. | To populate or refresh development data. Seeders should be safe to run repeatedly. |
| `db:migrate` | Creates a development migration from schema changes and applies all pending migrations. | During local development after changing the schema. Review the generated SQL. |
| `db:deploy` | Applies committed pending migrations without creating new ones. | Deployment and CI environments. Do not use it to develop a new schema change. |
| `db:reset` | Drops or resets the development database, reapplies all migrations, and runs seeders. | Only when intentionally rebuilding a development database. This destroys local database data. |

Examples from `apps/api`:

```bash
cd apps/api

bun run db:format
bun run db:generate
bun run db:seed
bun run db:migrate
bun run db:deploy
bun run db:reset
```

The API `build` script is also Prisma-aware:

```bash
cd apps/api
bun run build
```

It runs `db:generate` first and then compiles NestJS. Building does not create
or apply migrations. Likewise, `db:generate` changes generated code only; it
does not change the database.

### Choosing the right command

For a normal local schema change, use this sequence:

```text
Edit .prisma file
      ↓
db:format
      ↓
db:generate
      ↓
db:migrate
      ↓
db:seed (when development data is needed)
```

Use `db:deploy` when the migration already exists in version control. Use
`db:reset` only when losing the local database is acceptable. If the database
and migration history are out of sync, inspect the state and migration files
first; do not reset automatically, especially outside local development.

## Seeders

Seeders belong in [`apps/api/prisma/seeders/`](../../apps/api/prisma/seeders/).
Each logical dataset gets its own file. The top-level
[`prisma/seed.ts`](../../apps/api/prisma/seed.ts) is only the entry point: it
creates Prisma, calls the seeder functions in dependency order, and disconnects
from the database.

```text
apps/api/prisma/
├── seed.ts
└── seeders/
    ├── <feature>.seeder.ts
    └── <another-feature>.seeder.ts
```

### Create a feature seeder

Use a named function that accepts the generated `PrismaClient`. Keep the data
for one logical feature in this file and use `upsert` (or another deliberate
idempotent strategy) so running the seed command repeatedly does not create
duplicates:

```ts
import type { PrismaClient } from '../../src/generated/prisma/client.js';

const seedKey = 'example-key';

export async function seedModuleName(prisma: PrismaClient) {
  return prisma.moduleName.upsert({
    where: { key: seedKey },
    update: {},
    create: {
      key: seedKey,
      label: 'Example label',
      enabled: true,
    },
  });
}
```

The value used in `where` must identify the same record on every run. Prefer a
stable unique key from the Prisma model rather than a generated UUID. If the
seeded record depends on another record, call the other seeder first or create
the related data in the same nested Prisma operation.

### Register the seeder in `seed.ts`

Import each seeder explicitly and call it in the order required by foreign-key
dependencies:

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedModuleName } from './seeders/module-name.seeder.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export async function seed() {
  const moduleName = await seedModuleName(prisma);

  console.log('Seeded module:', moduleName.key);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
```

Do not instantiate a second `PrismaClient` inside an individual seeder. The
shared client from `seed.ts` ensures all seeders use the same connection and
that the entry point controls cleanup.

