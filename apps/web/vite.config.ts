import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  envDir: '../../.devcontainer',
  plugins: [react()],
  server: {
    host: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': apiTarget,
      '/swagger': apiTarget,
    },
  },
});
