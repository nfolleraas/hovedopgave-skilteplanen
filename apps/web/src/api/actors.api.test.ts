import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ActorDraft } from '../pages/actors-page/actor.types.js';

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
  it('deletes an actor by uuid through the proxy without a request body', async () => {
    respond = (config) => {
      assert.equal(config.baseURL, '/api');
      assert.equal(config.url, '/actors/actor-id');
      assert.equal(config.method, 'delete');
      assert.equal(config.data, undefined);
      return { uuid: 'actor-id' };
    };
    await deleteActor('actor-id');
  });

  it('propagates deletion failures so the dialog can show an error', async () => {
    const error = new AxiosError('Deletion failed', 'ERR_NETWORK');
    respond = () => {
      throw error;
    };
    await assert.rejects(deleteActor('actor-id'), (caught) => caught === error);
  });

  it('loads actors using GET through the proxy with a timeout', async () => {
    const actors = [{ uuid: 'actor-id', name: 'Test Actor' }];
    respond = (config) => {
      assert.equal(config.baseURL, '/api');
      assert.equal(config.url, '/actors');
      assert.equal(config.method, 'get');
      assert.equal(config.timeout, 10000);
      return actors;
    };
    assert.deepEqual(await getActors(), actors);
  });

  it('propagates request failures to the page', async () => {
    const error = new AxiosError('Request failed', 'ERR_NETWORK');
    respond = () => {
      throw error;
    };
    await assert.rejects(getActors(), (caught) => caught === error);
  });

  it('forwards cancellation and supports an empty actor list', async () => {
    const controller = new AbortController();
    respond = (config) => {
      assert.equal(config.signal, controller.signal);
      return [];
    };
    assert.deepEqual(await getActors(controller.signal), []);
    controller.abort();
    await assert.rejects(getActors(controller.signal), (error) =>
      axios.isCancel(error),
    );
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
      assert.equal(config.url, '/actors');
      assert.equal(config.method, 'post');
      assert.deepEqual(JSON.parse(config.data), {
        ...draft,
        applicationCaseNumber: 'CASE-123',
      });
      return { uuid: 'actor-id' };
    };
    assert.deepEqual(await createActor('CASE-123', draft), {
      uuid: 'actor-id',
    });
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
      uuid: 'server-actor-id',
      contactPersons: [{ uuid: 'server-contact-id', ...draft.contactPerson }],
    };
    respond = (config) => {
      const { role: _role, ...update } = draft;
      const expected =
        config.method === 'post'
          ? { ...draft, applicationCaseNumber: 'CASE-123' }
          : update;
      assert.deepEqual(JSON.parse(config.data), expected);
      return savedActor;
    };
    assert.deepEqual(await createActor('CASE-123', draft), savedActor);
    assert.deepEqual(await updateActor('server-actor-id', draft), savedActor);
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
    await assert.rejects(
      createActor('CASE-123', draft),
      (caught) => caught === error,
    );
    await assert.rejects(
      updateActor('actor-id', draft),
      (caught) => caught === error,
    );
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
      assert.equal(config.url, '/actors/actor-id');
      assert.equal(config.method, 'patch');
      const { role: _role, ...update } = draft;
      assert.deepEqual(JSON.parse(config.data), update);
      assert.equal(Object.hasOwn(JSON.parse(config.data), 'role'), false);
      return { uuid: 'actor-id', name: 'Updated Actor' };
    };
    assert.deepEqual(await updateActor('actor-id', draft), {
      uuid: 'actor-id',
      name: 'Updated Actor',
    });
  });
});
