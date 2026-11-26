# Routing

The web app uses React Router. Routes are defined centrally in
[`router.tsx`](../../apps/web/src/app/router.tsx), using two exported objects:

- `routes` gives each URL a reusable name, such as `routes.createRoadPermit`.
- `pages` maps each URL to the React component that should render there.

## How the setup works

1. [`main.tsx`](../../apps/web/src/main.tsx) wraps the app in `BrowserRouter`.
   This connects React Router to the browser URL and navigation history.
2. [`App.tsx`](../../apps/web/src/app/App.tsx) loops over `pages` and creates a
   `<Route>` for every entry:

   ```tsx
   {Object.entries(pages).map(([path, Page]) => (
     <Route element={<Page />} key={path} path={path} />
   ))}
   ```

3. React Router renders the matching page. If no route matches, the `*` route
   displays the not-found page.

The navbar and footer sit outside `<Routes>`, so they appear on every page,
including the not-found page.

### Current routes

| Constant | URL | Component |
| --- | --- | --- |
| `routes.home` | `/` | `HomePage` |
| `routes.application` | `/ansoegning` | `ApplicationPage` |
| `routes.createRoadPermit` | `/ansoegning/opret-vejtilladelse` | `CreateRoadPermitPage` |
| `routes.contacts` | `/kontaktpersoner` | `ContactsPage` |
| `routes.messages` | `/beskeder` | `MessagesPage` |
| `routes.login` | `/login` | `LoginPage` |

These are flat route definitions. A URL such as
`/ansoegning/opret-vejtilladelse` does not automatically render inside
`ApplicationPage`; it renders `CreateRoadPermitPage` directly.

## Adding a new path

For example, to add `/ansoegning/opret-gravetilladelse`:

1. Create the page component under
   [`apps/web/src/pages/`](../../apps/web/src/pages/), following nearby page
   structure. In this example, create
   `application-page/create-digging-permit/index.tsx` and default-export a
   `CreateDiggingPermitPage` component. Read the
   [stylesheet](styles/stylesheet.md) before implementing the UI.
2. Import the component in
   [`router.tsx`](../../apps/web/src/app/router.tsx):

   ```tsx
   import CreateDiggingPermitPage from '../pages/application-page/create-digging-permit';
   ```

3. Add a property to the existing `routes` object, keeping its `as const`:

   ```tsx
   createDiggingPermit: '/ansoegning/opret-gravetilladelse',
   ```

4. Add the corresponding entry to the existing `pages` object:

   ```tsx
   [routes.createDiggingPermit]: CreateDiggingPermitPage,
   ```

Both entries are required. A `routes` entry alone only defines a URL constant;
it does not register a page. No change to
[`App.tsx`](../../apps/web/src/app/App.tsx) is needed for a normal new page.

### Definition conventions

- Use descriptive camelCase keys in `routes`, such as `createDiggingPermit`.
- Follow the existing Danish URL names with lowercase, hyphen-separated words.
- Define full paths starting with `/`. Follow the existing convention of no
  trailing slash, except for the home path `/`.
- Use `[routes.someName]` as the key in `pages` instead of repeating the URL.
- Store the component itself in `pages`, such as `CreateDiggingPermitPage`,
  rather than JSX such as `<CreateDiggingPermitPage />`. The map is typed as
  `Record<string, ComponentType>` and the app instantiates each component.
- Registered page components must work without required props, because the
  app renders them as `<Page />`.

## Linking to a route

Import `routes` and use React Router's `Link` for internal navigation. For
example, from a component directly inside a page folder:

```tsx
import { Link } from 'react-router';
import { routes } from '../../app/router.js';

// Inside the component's returned JSX:
<Link to={routes.createRoadPermit}>Opret vejtilladelse</Link>
```

Adjust the relative import to match the component's location. MUI buttons can
also use `component={Link}` with `to={routes.someName}`. The existing
[`CTAButton`](../../apps/web/src/components/ui/button/CTAButton.tsx) already
wraps this behavior; pass the route constant through its `to` prop.

Adding a route does not automatically add a navbar tab. If it belongs in the
main navigation, add it to `navigationItems` in
[`navbar.tsx`](../../apps/web/src/components/layout/navbar/navbar.tsx) and add
its translated label to the locale files. The navbar matches section prefixes,
so `/ansoegning/opret-vejtilladelse` already highlights the application tab.

## Page sections versus URL routes

[`ChooseMunicipalityAndTitlePage`](../../apps/web/src/pages/application-page/create-road-permit/pages/ChooseMunicipalityAndTitlePage.tsx)
is a section inside the road-permit page. Despite its name, it has no separate
route. The road-permit
[`index.tsx`](../../apps/web/src/pages/application-page/create-road-permit/index.tsx)
defines a `categories` array, and
[`MasterDetailGrid`](../../apps/web/src/components/layout/masterDetail/masterDetail.tsx)
uses local React state to choose which section to show.

To add another form step with the same behavior, add it to `categories`.
The URL stays `/ansoegning/opret-vejtilladelse`; browser back/forward does not
switch between those steps. If a step needs its own shareable URL, define its
routing explicitly. The current map does not define nested layouts or outlets.

## Checking a new route

Open the new URL directly, follow the link to it, refresh the page, and check
browser back/forward navigation. Also confirm that an unknown URL still shows
the not-found page. For code changes, run from the repository root:

```bash
bun run check
bun run --filter web build
```

When deploying, the web server must serve the app's `index.html` for frontend
paths such as `/ansoegning/opret-vejtilladelse`. `BrowserRouter` needs this
fallback for direct links and refreshes to work.
