import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import App, { NotFoundPage } from './app/App.js';
import { Providers } from './app/providers.js';
import { pages, routes } from './app/router.js';
import { i18nReady } from './config/i18n.js';
import ActorsLayout from './pages/actors-page/actors-layout.js';
import ActorsPage from './pages/actors-page/index.js';
import CreateActorPage from './pages/create-actor-page/index.js';
import UpdateActorPage from './pages/update-actor-page/index.js';
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
      {
        path: routes.selectedApplication,
        Component: ActorsLayout,
        children: [
          { index: true, Component: ActorsPage },
          { path: 'actors/create', Component: CreateActorPage },
          { path: 'actors/:uuid/edit', Component: UpdateActorPage },
        ],
      },
      {
        Component: ActorsLayout,
        children: [
          {
            path: `${routes.application}/actors/create`,
            Component: CreateActorPage,
          },
          {
            path: `${routes.application}/actors/:uuid/edit`,
            Component: UpdateActorPage,
          },
        ],
      },
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
