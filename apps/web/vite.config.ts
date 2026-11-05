import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': 'http://localhost:3000',
      '/swagger': 'http://localhost:3000',
    },
  },
});
