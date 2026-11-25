import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App, { NotFoundPage } from './app/App.js';
import { Providers } from './app/providers.js';
import { pages } from './app/router.js';
import { i18nReady } from './config/i18n.js';
import './index.css';

await i18nReady;

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}

const router = createBrowserRouter([
  {
    Component: App,
    children: [
      ...Object.entries(pages).map(([path, Component]) => ({
        path,
        Component,
      })),
      { path: '*', Component: NotFoundPage },
    ],
  },
]);

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
