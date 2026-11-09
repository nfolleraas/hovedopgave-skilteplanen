import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createArea,
  createAreas,
  deleteArea,
  getApplicationAreas,
  updateArea,
} from './areas.api.js';

const originalFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof mock>;

/** The method, URL and parsed body of the only request sent. */
function sentRequest() {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    method: init.method,
    url,
    body: init.body ? JSON.parse(String(init.body)) : undefined,
  };
}

beforeEach(() => {
  fetchMock = mock(async () => new Response('{}', { status: 200 }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('areas API', () => {
  test('gets the areas of an application by case number', async () => {
    await getApplicationAreas('DEV GRAVE&1');

    expect(sentRequest()).toEqual({
      method: 'GET',
      url: '/api/areas?applicationId=DEV+GRAVE%261',
      body: undefined,
    });
  });

  test('creates one area per selected road in one request', async () => {
    const roads = [
      { roadName: 'Strandvej', roadOwnership: 'Municipality' as const },
      { roadName: 'Havnegade', roadOwnership: 'Private' as const },
    ];

    await createAreas('APP-1', roads);

    expect(sentRequest()).toEqual({
      method: 'POST',
      url: '/api/areas/bulk',
      body: { applicationId: 'APP-1', areas: roads },
    });
  });

  test('creates a manual area with the case number in the body', async () => {
    await createArea('APP-1', { roadName: 'Ny vej', postalCode: '5000' });

    expect(sentRequest()).toEqual({
      method: 'POST',
      url: '/api/areas',
      body: { applicationId: 'APP-1', roadName: 'Ny vej', postalCode: '5000' },
    });
  });

  test('updates an area by its uuid', async () => {
    await updateArea('a/1', { lengthInMeters: 5 });

    expect(sentRequest()).toEqual({
      method: 'PATCH',
      url: '/api/areas/a%2F1',
      body: { lengthInMeters: 5 },
    });
  });

  test('deletes an area by its uuid', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteArea('a1');

    expect(sentRequest()).toEqual({
      method: 'DELETE',
      url: '/api/areas/a1',
      body: undefined,
    });
  });
});
