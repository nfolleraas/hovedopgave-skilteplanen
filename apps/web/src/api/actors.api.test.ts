import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ActorDraft } from '../pages/application-page/actor-form.validation.js';
import { createActor, getApplicationActors } from './actors.api.js';

describe('actor API', () => {
  it('loads actors for the selected application case number', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input) => {
        assert.equal(input, '/api/actors/application/CASE%2F123');
        return Response.json({ type: 'RoadUsePermit', actors: [] });
      };

      assert.deepEqual(await getApplicationActors('CASE/123'), {
        type: 'RoadUsePermit',
        actors: [],
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sends the selected case number with the actor and contact person', async () => {
    const draft: ActorDraft = {
      role: 'Contractor',
      name: 'Test Actor',
      phoneNumber: '12345678',
      email: 'actor@example.com',
      cvrNumber: '87654321',
      department: 'Test',
      address: {
        street: 'Testvej',
        houseNumber: '1',
        postalCode: '5000',
        city: 'Odense',
      },
      contactPerson: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phoneNumber: '11223344',
      },
    };
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input, init) => {
        assert.equal(input, '/api/actors');
        assert.equal(init?.method, 'POST');
        assert.deepEqual(JSON.parse(String(init?.body)), {
          ...draft,
          applicationCaseNumber: 'CASE-123',
        });
        return Response.json({ uuid: 'actor-id' });
      };

      assert.deepEqual(await createActor('CASE-123', draft), {
        uuid: 'actor-id',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
