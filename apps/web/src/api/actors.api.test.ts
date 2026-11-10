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
const { createActor, getActors } = await import('./actors.api.js');
axios.defaults.adapter = originalAdapter;

describe('actor API', () => {
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
});
