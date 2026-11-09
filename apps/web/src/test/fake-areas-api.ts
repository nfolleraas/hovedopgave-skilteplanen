import type { Area } from '../types/area.types.js';

export interface SentRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | undefined;
}

const emptyDetails = {
  houseNumberFrom: null,
  houseNumberTo: null,
  alternativeDescription: null,
  roadSection: null,
  roadSectionDescription: null,
  roadSide: null,
  direction: null,
  lengthInMeters: null,
  widthInMeters: null,
  depthInMeters: null,
  areaInSquareMeters: null,
};

/** Builds an area as the API returns it. */
export function buildArea(uuid: string, overrides: Partial<Area> = {}): Area {
  return {
    uuid,
    applicationId: 'APP-1',
    roadName: 'Strandvej',
    roadOwnership: 'Municipality',
    postalCode: '5000',
    ...emptyDetails,
    ...overrides,
  };
}

function withCalculatedArea(area: Area): Area {
  const { lengthInMeters, widthInMeters } = area;
  return {
    ...area,
    areaInSquareMeters:
      lengthInMeters !== null && widthInMeters !== null
        ? lengthInMeters * widthInMeters
        : null,
  };
}

/**
 * An in-memory stand-in for the areas endpoints, installed as `fetch`. It
 * stores areas like the API does and records every request, so tests can
 * check what the web app sent. It does not repeat the API's validation.
 */
export class FakeAreasApi {
  readonly requests: SentRequest[] = [];
  private readonly areas = new Map<string, Area>();
  private nextId = 1;
  private nextFailure: { status: number; body: unknown } | null = null;
  private originalFetch: typeof fetch | null = null;

  install(): this {
    this.originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: string | URL, init?: RequestInit) =>
      this.handle(String(input), init ?? {})) as typeof fetch;
    return this;
  }

  restore(): void {
    if (this.originalFetch) globalThis.fetch = this.originalFetch;
  }

  /** Areas that already exist when the test starts. */
  seed(...areas: Area[]): this {
    for (const area of areas) this.areas.set(area.uuid, area);
    return this;
  }

  /** Makes the next request fail with this status and body. */
  failNext(status: number, body: unknown = {}): void {
    this.nextFailure = { status, body };
  }

  stored(uuid: string): Area | undefined {
    return this.areas.get(uuid);
  }

  private async handle(url: string, init: RequestInit): Promise<Response> {
    const method = init.method ?? 'GET';
    const path = url.split('?')[0];
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    this.requests.push({ method, path, body });

    if (this.nextFailure) {
      const { status, body: errorBody } = this.nextFailure;
      this.nextFailure = null;
      return json(status, errorBody);
    }

    const id = decodeURIComponent(path.split('/')[3] ?? '');
    if (method === 'POST' && path === '/api/areas/bulk') {
      const created = body.areas.map((fields: Partial<Area>) =>
        this.create(body.applicationId, fields),
      );
      return json(201, created);
    }
    if (method === 'POST' && path === '/api/areas') {
      const { applicationId, ...fields } = body;
      return json(201, this.create(applicationId, fields));
    }
    if (method === 'PATCH' && this.areas.has(id)) {
      const updated = withCalculatedArea({
        ...(this.areas.get(id) as Area),
        ...body,
      });
      this.areas.set(id, updated);
      return json(200, updated);
    }
    if (method === 'DELETE' && this.areas.has(id)) {
      this.areas.delete(id);
      return new Response(null, { status: 204 });
    }
    return json(404, { code: 'NOT_FOUND' });
  }

  private create(applicationId: string, fields: Partial<Area>): Area {
    const area = withCalculatedArea(
      buildArea(`created-${this.nextId++}`, { applicationId, ...fields }),
    );
    this.areas.set(area.uuid, area);
    return area;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
