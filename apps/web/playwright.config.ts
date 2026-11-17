import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';
const apiURL = 'http://127.0.0.1:4300';
const databaseURL = process.env.DATABASE_URL;

if (!databaseURL) {
  throw new Error('Set DATABASE_URL in .devcontainer/.env or the environment.');
}

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  testDir: './src/tests/e2e',
  use: {
    actionTimeout: 8_000,
    baseURL,
    locale: 'en-GB',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'bun run --filter api start',
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
