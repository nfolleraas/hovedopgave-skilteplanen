import { expect, it } from 'vitest';
import { reportError } from './report-error.js';

it('reports the failed operation with the original error as its cause', () => {
  const cause = new Error('Malformed API response');
  const originalConsoleError = console.error;
  let reported: unknown;
  try {
    console.error = (error: unknown): void => {
      reported = error;
    };
    reportError('Loading actors failed', cause);
  } finally {
    console.error = originalConsoleError;
  }
  expect(reported).toBeInstanceOf(Error);
  if (!(reported instanceof Error))
    throw new Error('Expected a reported Error.');
  expect(reported.message).toBe('Loading actors failed');
  expect(reported.cause).toBe(cause);
});
