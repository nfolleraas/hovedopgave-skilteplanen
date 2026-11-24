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
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'chromium',
      testDir: './e2e',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'da-DK',
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'mobile-chromium',
      testDir: './e2e',
      use: {
        ...devices['Pixel 7'],
        locale: 'da-DK',
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'road-permit-chromium',
      testDir: './tests',
      testMatch: '**/*.spec.{ts,tsx}',
      use: {
        ...devices['Desktop Chrome'],
        actionTimeout: 8_000,
        contextOptions: { reducedMotion: 'reduce' },
        locale: 'en-GB',
      },
    },
  ],
  use: {
    baseURL,
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
      reuseExistingServer: false,
    },
  ],
  workers: 2,
});
