// Prisma CLI configuration for the API workspace.
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun --bun prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
