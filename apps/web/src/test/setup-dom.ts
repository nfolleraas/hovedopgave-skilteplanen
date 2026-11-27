import { afterEach } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost:5173/' });

// Testing Library needs the DOM above when it loads, so it is imported here.
const { cleanup } = await import('@testing-library/react');

// Hooks in a preload apply to every test file.
afterEach(() => {
  cleanup();
});
