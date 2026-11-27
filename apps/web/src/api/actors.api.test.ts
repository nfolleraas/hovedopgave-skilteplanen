import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import type {
  ActorDraft,
  SavedActor,
} from '../pages/actors-page/actor.types.js';

const validActor: SavedActor = {
  uuid: 'actor-id',
  name: 'Test Actor',
  role: 'Private',
  phoneNumber: '12345678',
  email: 'actor@example.com',
  cvrNumber: null,
  department: null,
  address: {
    uuid: 'address-id',
    street: 'Testvej',
    houseNumber: '1',
    postalCode: '5000',
    city: 'Odense',
  },
  contactPersons: [],
};

// Capture requests at Axios's transport boundary without using a live API.
let respond: (config: InternalAxiosRequestConfig) => unknown;
const originalAdapter = axios.defaults.adapter;
axios.defaults.adapter = async (config) => ({
  data: respond(config),
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});
const { createActor, deleteActor, getActors, updateActor } = await import(
  './actors.api.js'
);
axios.defaults.adapter = originalAdapter;

describe('actor API', () => {
  it('rejects missing application context before sending a create request', async () => {
    let requests = 0;
    respond = () => {
      requests++;
      return validActor;
    };
    for (const caseNumber of ['', '   ']) {
      await expect(
        createActor(caseNumber, {
          ...validActor,
          cvrNumber: undefined,
          department: undefined,
        }),
      ).rejects.toThrow(/valgt ansøgning/);
    }
    expect(requests).toBe(0);
  });

  it('deletes an actor by uuid through the proxy without a request body', async () => {
    respond = (config) => {
      expect(config.baseURL).toBe('/api');
      expect(config.url).toBe('/actors/actor-id');
      expect(config.method).toBe('delete');
      expect(config.data).toBe(undefined);
      return { uuid: 'actor-id' };
    };
    await deleteActor('actor-id');
  });

  it('propagates deletion failures so the dialog can show an error', async () => {
    const error = new AxiosError('Deletion failed', 'ERR_NETWORK');
    respond = () => {
      throw error;
    };
    await expect(deleteActor('actor-id')).rejects.toBe(error);
  });

  it('loads actors using GET through the proxy with a timeout', async () => {
    const actors = [validActor];
    respond = (config) => {
      expect(config.baseURL).toBe('/api');
      expect(config.url).toBe('/actors');
      expect(config.method).toBe('get');
      expect(config.timeout).toBe(10000);
      return actors;
    };
    expect(await getActors()).toStrictEqual(actors);
  });

  it('propagates request failures to the page', async () => {
    const error = new AxiosError('Request failed', 'ERR_NETWORK');
    respond = () => {
      throw error;
    };
    await expect(getActors()).rejects.toBe(error);
  });

  it('forwards cancellation and supports an empty actor list', async () => {
    const controller = new AbortController();
    respond = (config) => {
      expect(config.signal).toBe(controller.signal);
      return [];
    };
    expect(await getActors(controller.signal)).toStrictEqual([]);
    controller.abort();
    await expect(getActors(controller.signal)).rejects.toMatchObject({
      __CANCEL__: true,
    });
  });

  it('preserves the existing actor POST request', async () => {
    const draft: ActorDraft = {
      role: 'Private',
      name: 'Test Actor',
      phoneNumber: '12345678',
      email: 'actor@example.com',
      cvrNumber: '',
      department: '',
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
    };
    respond = (config) => {
      expect(config.url).toBe('/actors');
      expect(config.method).toBe('post');
      expect(JSON.parse(config.data)).toStrictEqual({
        ...draft,
        applicationCaseNumber: 'CASE-123',
      });
      return validActor;
    };
    expect(await createActor('CASE-123', draft)).toStrictEqual(validActor);
  });

  it('sends business contact details for creation and editing and returns the saved actor', async () => {
    const draft: ActorDraft = {
      role: 'Contractor',
      name: 'Test Entreprise',
      phoneNumber: '12345678',
      email: 'actor@example.com',
      cvrNumber: '87654321',
      department: 'Anlæg',
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
      contactPerson: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phoneNumber: '87654321',
        availability: 'Evening',
      },
    };
    const savedActor = {
      ...validActor,
      uuid: 'server-actor-id',
      contactPersons: [{ uuid: 'server-contact-id', ...draft.contactPerson }],
    };
    respond = (config) => {
      const { role: _role, ...update } = draft;
      const expected =
        config.method === 'post'
          ? { ...draft, applicationCaseNumber: 'CASE-123' }
          : update;
      expect(JSON.parse(config.data)).toStrictEqual(expected);
      return savedActor;
    };
    expect(await createActor('CASE-123', draft)).toStrictEqual(savedActor);
    expect(await updateActor('server-actor-id', draft)).toStrictEqual(
      savedActor,
    );
  });

  it('propagates create and update failures so the form preserves entered values', async () => {
    const error = new AxiosError('Save failed', 'ERR_NETWORK');
    const draft: ActorDraft = {
      role: 'Private',
      name: 'Jane Doe',
      phoneNumber: '12345678',
      email: 'jane@example.com',
      cvrNumber: '',
      department: '',
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
    };
    respond = () => {
      throw error;
    };
    await expect(createActor('CASE-123', draft)).rejects.toBe(error);
    await expect(updateActor('actor-id', draft)).rejects.toBe(error);
  });

  it('updates an actor using PATCH through the proxy without submitting its role', async () => {
    const draft: ActorDraft = {
      role: 'Private',
      name: 'Updated Actor',
      phoneNumber: '87654321',
      email: 'updated@example.com',
      cvrNumber: '',
      department: '',
      address: {
        street: 'Nyvej',
        houseNumber: '2',
        postalCode: '8000',
        city: 'Aarhus',
      },
    };
    respond = (config) => {
      expect(config.url).toBe('/actors/actor-id');
      expect(config.method).toBe('patch');
      const { role: _role, ...update } = draft;
      expect(JSON.parse(config.data)).toStrictEqual(update);
      expect(Object.hasOwn(JSON.parse(config.data), 'role')).toBe(false);
      return { ...validActor, name: 'Updated Actor' };
    };
    expect(await updateActor('actor-id', draft)).toStrictEqual({
      ...validActor,
      name: 'Updated Actor',
    });
  });

  it('rejects responses that are not actor lists', async () => {
    for (const data of [null, {}, 'invalid']) {
      respond = () => data;
      await expect(getActors()).rejects.toThrow(/ugyldig aktørliste/);
    }
  });

  it('rejects malformed actors on list, create, and update responses', async () => {
    for (const data of [
      null,
      {},
      { ...validActor, uuid: '   ' },
      { ...validActor, name: 123 },
      { ...validActor, role: 'Unknown' },
      { ...validActor, phoneNumber: null },
      { ...validActor, email: undefined },
      { ...validActor, cvrNumber: 12345678 },
      { ...validActor, department: {} },
      { ...validActor, address: null },
      { ...validActor, address: { ...validActor.address, city: '' } },
      { ...validActor, contactPersons: null },
      { ...validActor, contactPersons: [{}] },
      {
        ...validActor,
        contactPersons: [
          {
            uuid: 'contact-id',
            name: 'Jane Doe',
            email: 'jane@example.com',
            phoneNumber: '12345678',
            availability: 'Unknown',
          },
        ],
      },
    ]) {
      respond = () => [validActor, data];
      await expect(getActors()).rejects.toThrow(/ugyldige aktøroplysninger/);
      respond = () => data;
      await expect(
        createActor('CASE-123', {
          ...validActor,
          cvrNumber: undefined,
          department: undefined,
        }),
      ).rejects.toThrow(/ugyldige aktøroplysninger/);
      await expect(
        updateActor('actor-id', {
          ...validActor,
          cvrNumber: undefined,
          department: undefined,
        }),
      ).rejects.toThrow(/ugyldige aktøroplysninger/);
    }
  });
});
