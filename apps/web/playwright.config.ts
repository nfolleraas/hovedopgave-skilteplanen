import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './node_modules/.cache/playwright-results',
  globalSetup: '../api/test/browser-setup.ts',
  use: {
    baseURL: 'http://localhost:5190',
    browserName: 'chromium',
    locale: 'da-DK',
  },
  webServer: {
    command: 'bun run --bun vite --host localhost --port 5190 --strictPort',
    env: { WEB_API_PROXY_TARGET: 'http://localhost:3190' },
    url: 'http://localhost:5190',
  },
});
