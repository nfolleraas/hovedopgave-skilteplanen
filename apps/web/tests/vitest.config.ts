import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      'tests/**/*.test.{ts,tsx}',
      'src/api/addresses.api.test.ts',
      'src/hooks/use-applicants.test.ts',
      'src/pages/create-applicant-page/**/*.test.ts',
    ],
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
});
