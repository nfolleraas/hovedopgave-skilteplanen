import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Starting the whole Nest app can take over 10s in the dev container.
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
