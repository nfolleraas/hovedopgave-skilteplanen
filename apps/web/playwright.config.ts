import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: './tests',
  use: { baseURL, browserName: 'chromium', locale: 'da-DK' },
  webServer: {
    command: 'bun run vite --host 127.0.0.1 --port 4174 --strictPort',
    url: baseURL,
  },
});
