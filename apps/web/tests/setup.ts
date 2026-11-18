import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  afterEach(cleanup);
}

afterEach(() => vi.unstubAllGlobals());
