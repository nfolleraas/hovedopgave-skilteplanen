import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174';
const apiURL = 'http://127.0.0.1:4175';
const databaseURL = process.env.E2E_DATABASE_URL;

export default defineConfig({
  testDir: './src/tests',
  use: { baseURL, browserName: 'chromium', locale: 'da-DK' },
  webServer: [
    ...(databaseURL
      ? [
          {
            command:
              'bun run build && bun run db:deploy && bun run db:seed && bun run start:prod',
            cwd: fileURLToPath(new URL('../api/', import.meta.url)),
            url: `${apiURL}/api/health`,
            env: { DATABASE_URL: databaseURL, PORT: '4175' },
            timeout: 120_000,
          },
        ]
      : []),
    {
      command: 'bun run vite --host 127.0.0.1 --port 4174 --strictPort',
      url: baseURL,
      env: databaseURL ? { PLAYWRIGHT_API_URL: apiURL } : {},
    },
  ],
});
