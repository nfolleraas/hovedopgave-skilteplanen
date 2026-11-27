import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { axiosClient } from '../api/client.api.js';
import type {
  ContactPerson,
  ContactPersonActor,
  ContactPersonApplication,
} from '../types/contact-person.types.js';
import { ActorRole, Availability } from '../types/prisma-enums.js';

export interface SentRequest {
  method: string;
  path: string;
  body: Record<string, unknown> | undefined;
}

/** Builds an actor as the contact persons API returns it. */
export function buildActor(
  uuid: string,
  overrides: Partial<ContactPersonActor> = {},
): ContactPersonActor {
  return {
    uuid,
    name: 'Graveselskabet A/S',
    role: ActorRole.Contractor,
    phoneNumber: '33333333',
    email: 'kontakt@graveselskabet.example',
    cvrNumber: '33333333',
    department: null,
    address: {
      street: 'Demovej',
      houseNumber: '10',
      postalCode: '5000',
      city: 'Odense C',
    },
    ...overrides,
  };
}

/** Builds a contact person as the API returns it. */
export function buildContactPerson(
  uuid: string,
  overrides: Partial<ContactPerson> = {},
): ContactPerson {
  return {
    uuid,
    applicationId: 'APP-1',
    actorId: 'actor-1',
    name: 'Jens Jensen',
    availability: Availability.Day,
    phoneNumber: '12345678',
    email: 'jens@example.com',
    ...overrides,
  };
}

/**
 * An in-memory stand-in for the contact persons endpoints, installed as
 * the adapter of the shared Axios client. It stores contact persons like the API does and records every
 * request, so tests can check what the web app sent. It does not repeat the
 * API's validation; use `failNext` to answer with an API error.
 */
export class FakeContactPersonsApi {
  readonly requests: SentRequest[] = [];
  private readonly contactPersons = new Map<string, ContactPerson>();
  private actors: ContactPersonActor[] = [];
  private nextId = 1;
  private nextFailure: { status: number; body: unknown } | null = null;
  private originalAdapter: InternalAxiosRequestConfig['adapter'];

  constructor(
    private readonly application: ContactPersonApplication = {
      caseNumber: 'APP-1',
      type: 'ExcavationPermit',
      status: 'Draft',
    },
  ) {}

  install(): this {
    this.originalAdapter = axiosClient.defaults.adapter;
    axiosClient.defaults.adapter = (config) => this.respond(config);
    return this;
  }

  restore(): void {
    axiosClient.defaults.adapter = this.originalAdapter;
  }

  /** Answers an Axios request and rejects non-2xx answers, as Axios does. */
  private async respond(
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> {
    const answer = await this.handle(`/api${config.url}`, {
      method: config.method?.toUpperCase(),
      body: config.data,
    });
    const text = await answer.text();
    const response: AxiosResponse = {
      data: text ? JSON.parse(text) : undefined,
      status: answer.status,
      statusText: answer.statusText,
      headers: {},
      config,
    };
    if (answer.ok) return response;
    throw new AxiosError(
      `Request failed with status code ${answer.status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    );
  }

  /** Actors on the application when the test starts. */
  withActors(...actors: ContactPersonActor[]): this {
    this.actors = actors;
    return this;
  }

  /** Contact persons that already exist when the test starts. */
  seed(...contactPersons: ContactPerson[]): this {
    for (const contactPerson of contactPersons) {
      this.contactPersons.set(contactPerson.uuid, contactPerson);
    }
    return this;
  }

  /** Makes the next request fail with this status and body. */
  failNext(status: number, body: unknown = {}): void {
    this.nextFailure = { status, body };
  }

  stored(uuid: string): ContactPerson | undefined {
    return this.contactPersons.get(uuid);
  }

  /** Requests other than the initial GET. */
  changes(): SentRequest[] {
    return this.requests.filter((request) => request.method !== 'GET');
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
    if (method === 'GET' && path === '/api/contact-persons') {
      return json(200, {
        application: this.application,
        actors: this.actors,
        contactPersons: [...this.contactPersons.values()],
      });
    }
    if (method === 'POST' && path === '/api/contact-persons') {
      const contactPerson = buildContactPerson(`created-${this.nextId++}`, {
        availability: Availability.Day,
        ...body,
      });
      this.contactPersons.set(contactPerson.uuid, contactPerson);
      return json(201, contactPerson);
    }
    if (method === 'PATCH' && this.contactPersons.has(id)) {
      const updated = {
        ...(this.contactPersons.get(id) as ContactPerson),
        ...body,
      };
      this.contactPersons.set(id, updated);
      return json(200, updated);
    }
    if (method === 'DELETE' && this.contactPersons.has(id)) {
      this.contactPersons.delete(id);
      return new Response(null, { status: 204 });
    }
    return json(404, { code: 'CONTACT_PERSON_NOT_FOUND' });
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
