import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL('../../.devcontainer', import.meta.url));
  const token = loadEnv(
    mode,
    envDir,
    'VITE_DATAFORSYNINGEN_',
  ).VITE_DATAFORSYNINGEN_TOKEN?.trim();
  return {
    envDir,
    // The map uses a public token; other development credentials stay private.
    envPrefix: ['VITE_API_', 'VITE_DATAFORSYNINGEN_TOKEN'],
    plugins: [react()],
    server: {
      host: true,
      proxy: {
        '/address-lookup': {
          target: 'https://adressevaelger.dk',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/address-lookup/, ''),
          bypass: (_request, response) => {
            if (!token && response) {
              response.statusCode = 503;
              response.end('Address search is not configured.');
              return false;
            }
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (request) => {
              const url = new URL(request.path, 'https://adressevaelger.dk');
              if (token) url.searchParams.set('token', token);
              request.path = `${url.pathname}${url.search}`;
            });
          },
        },
        '/api': apiTarget,
        '/swagger': apiTarget,
      },
    },
  };
});
