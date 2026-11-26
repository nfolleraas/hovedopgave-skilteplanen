import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';
const apiURL = 'http://127.0.0.1:4300';
const e2eDatabaseURL = process.env.E2E_DATABASE_URL;
const databaseURL = e2eDatabaseURL ?? process.env.DATABASE_URL;

if (!databaseURL) {
  throw new Error('Set DATABASE_URL in .devcontainer/.env or the environment.');
}

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      testDir: './tests',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'municipalities',
      testDir: './src/tests/municipalities',
      fullyParallel: false,
      use: { ...devices['Desktop Chrome'], locale: 'da-DK' },
    },
  ],
  testMatch: '**/*.spec.{ts,tsx}',
  use: {
    actionTimeout: 8_000,
    baseURL,
    contextOptions: { reducedMotion: 'reduce' },
    locale: 'en-GB',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: e2eDatabaseURL
        ? 'bun run build && bun run db:deploy && bun run db:seed && bun run start:prod'
        : 'bun run start',
      cwd: fileURLToPath(new URL('../api/', import.meta.url)),
      env: { DATABASE_URL: databaseURL, NODE_ENV: 'development', PORT: '4300' },
      timeout: 120_000,
      url: `${apiURL}/api/health`,
    },
    {
      command: 'bun run vite --host 127.0.0.1 --port 4173 --strictPort',
      env: {
        API_PROXY_TARGET: apiURL,
        VITE_DATAFORSYNINGEN_TOKEN: 'playwright-fixture',
      },
      url: baseURL,
    },
  ],
  workers: 5,
});
