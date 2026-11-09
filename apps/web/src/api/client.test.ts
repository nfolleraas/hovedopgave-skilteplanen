import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { ApiError, apiClient } from './client.js';

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof mock>;

function respondWith(status: number, body?: unknown) {
  // A new Response per call, because a body can only be read once.
  fetchMock.mockImplementation(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
      }),
  );
}

beforeEach(() => {
  fetchMock = mock();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('apiClient', () => {
  test('GET calls the API under /api and returns the JSON body', async () => {
    respondWith(200, { ok: true });

    await expect(apiClient.get('/areas/1')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/areas/1', {
      method: 'GET',
      headers: {},
      body: undefined,
    });
  });

  test('POST and PATCH send the body as JSON', async () => {
    respondWith(201, { uuid: 'a1' });

    await apiClient.post('/areas', { roadName: 'Strandvej' });
    await apiClient.patch('/areas/a1', { lengthInMeters: 5 });

    expect(fetchMock.mock.calls[0]).toEqual([
      '/api/areas',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"roadName":"Strandvej"}',
      },
    ]);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'PATCH',
      body: '{"lengthInMeters":5}',
    });
  });

  test('DELETE accepts an empty response', async () => {
    respondWith(204);

    await expect(apiClient.delete('/areas/a1')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  test('a failed request throws an ApiError with the error code', async () => {
    respondWith(400, { code: 'LAST_AREA', message: 'Nope' });

    const error = await apiClient.delete('/areas/a1').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe('LAST_AREA');
    expect(error.body).toEqual({ code: 'LAST_AREA', message: 'Nope' });
  });

  test('an error without a code has no code', async () => {
    respondWith(500);

    const error = await apiClient.get('/areas').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
    expect(error.code).toBeUndefined();
  });
});
