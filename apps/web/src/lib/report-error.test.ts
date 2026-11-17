import assert from 'node:assert/strict';
import { it } from 'node:test';
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
  assert.ok(reported instanceof Error);
  assert.equal(reported.message, 'Loading actors failed');
  assert.equal(reported.cause, cause);
});
