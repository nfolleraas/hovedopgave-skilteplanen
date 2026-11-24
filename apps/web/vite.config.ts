import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000',
      '/swagger': 'http://localhost:3000',
    },
  },
});
