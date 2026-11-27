import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig(() => {
  const envDir = fileURLToPath(new URL('../../.devcontainer', import.meta.url));
  return {
    envDir,
    // Address lookups and the map use the public browser token.
    envPrefix: ['VITE_API_', 'VITE_DATAFORSYNINGEN_TOKEN'],
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/api': apiTarget,
        '/swagger': apiTarget,
      },
    },
  };
});
