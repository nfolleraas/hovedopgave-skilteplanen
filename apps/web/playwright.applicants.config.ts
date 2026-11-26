import { defineConfig } from '@playwright/test';

const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? '3190');
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? '5190');
const webURL = `http://localhost:${webPort}`;

export default defineConfig({
  testDir: './tests/applicants/e2e',
  outputDir: './node_modules/.cache/playwright-results',
  globalSetup: '../api/test/browser-setup.ts',
  use: {
    baseURL: webURL,
    browserName: 'chromium',
    locale: 'da-DK',
  },
  webServer: {
    command: `bun run --bun vite --host localhost --port ${webPort} --strictPort`,
    env: { API_PROXY_TARGET: `http://localhost:${apiPort}` },
    url: webURL,
  },
});
