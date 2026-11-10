import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const token = loadEnv(
    mode,
    fileURLToPath(new URL('../../.devcontainer', import.meta.url)),
    'VITE_DATAFORSYNINGEN_',
  ).VITE_DATAFORSYNINGEN_TOKEN;
  return {
    // Only the API URL is public; address credentials stay in the Vite process.
    envPrefix: 'VITE_API_',
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
              url.searchParams.set('token', token);
              request.path = `${url.pathname}${url.search}`;
            });
          },
        },
        '/api': 'http://localhost:3000',
        '/swagger': 'http://localhost:3000',
      },
    },
  };
});
