# API seeders

This guide describes how to add repeatable development data for the NestJS
API. For feature structure, repositories, Prisma models, and migrations, see
[API modules](modules.md).

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

## Create a feature seeder

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

## Register the seeder in `seed.ts`

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

## Run seeders

Run the seed script from the API workspace:

```bash
cd apps/api
bun run db:seed
```

The `db:reset` command also runs seeders after rebuilding the development
database, but it destroys local data. See [API modules](modules.md#prisma-scripts)
for the complete Prisma command reference.
