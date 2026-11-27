import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, test } from 'vitest';
import {
  getApiErrorCode,
  getApiErrorStatus,
} from '../../src/api/client.api.js';

function apiError(status: number, data?: unknown) {
  const config = { headers: new AxiosHeaders() };
  const response: AxiosResponse = {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  };
  return new AxiosError('Request failed', undefined, config, null, response);
}

describe('getApiErrorStatus', () => {
  test('reads the status of a failed request', () => {
    expect(getApiErrorStatus(apiError(404))).toBe(404);
  });

  test('is undefined when the API did not answer', () => {
    expect(
      getApiErrorStatus(new AxiosError('Network Error', 'ERR_NETWORK')),
    ).toBeUndefined();
    expect(getApiErrorStatus(new Error('Boom'))).toBeUndefined();
  });
});

describe('getApiErrorCode', () => {
  test('reads the error code from the body', () => {
    const error = apiError(400, { code: 'LAST_AREA', message: 'Nope' });

    expect(getApiErrorCode(error)).toBe('LAST_AREA');
  });

  test('an error without a code has no code', () => {
    expect(getApiErrorCode(apiError(500))).toBeUndefined();
  });

  test('an error page that is not JSON has no code', () => {
    // A proxy answers like this when the API is down.
    const page = '<html><body>502 Bad Gateway</body></html>';

    expect(getApiErrorCode(apiError(502, page))).toBeUndefined();
  });

  test('a value that is not an Axios error has no code', () => {
    expect(getApiErrorCode(new Error('Boom'))).toBeUndefined();
  });
});
