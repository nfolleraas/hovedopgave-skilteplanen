import { afterEach, describe, expect, it } from 'bun:test';
import { useApplicants } from './use-applicants.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('useApplicants', () => {
  it('returns the created applicant payload when the API responds OK', async () => {
    globalThis.fetch = (async (_input, _init) => {
      return new Response(JSON.stringify({ uuid: '123' }), { status: 201 });
    }) as typeof fetch;

    const { createApplicant } = useApplicants();
    await expect(
      createApplicant({
        name: 'Test',
        type: 'private',
        phoneNumber: '12345678',
        email: 'test@example.com',
        street: 'Vestergade',
        houseNumber: '1',
        postalCode: '8000',
        city: 'Aarhus C',
      }),
    ).resolves.toEqual({ uuid: '123' });
  });

  it('throws the API message when the request fails', async () => {
    globalThis.fetch = (async (_input, _init) => {
      return new Response(JSON.stringify({ message: 'Nope' }), { status: 409 });
    }) as typeof fetch;

    const { createApplicant } = useApplicants();
    await expect(
      createApplicant({
        name: 'Test',
        type: 'private',
        phoneNumber: '12345678',
        email: 'test@example.com',
        street: 'Vestergade',
        houseNumber: '1',
        postalCode: '8000',
        city: 'Aarhus C',
      }),
    ).rejects.toThrow('Nope');
  });

  it('throws a combined API message array when the request fails', async () => {
    globalThis.fetch = (async (_input, _init) => {
      return new Response(JSON.stringify({ message: ['A', 'B'] }), {
        status: 400,
      });
    }) as typeof fetch;

    const { createApplicant } = useApplicants();
    await expect(
      createApplicant({
        name: 'Test',
        type: 'private',
        phoneNumber: '12345678',
        email: 'test@example.com',
        street: 'Vestergade',
        houseNumber: '1',
        postalCode: '8000',
        city: 'Aarhus C',
      }),
    ).rejects.toThrow('A, B');
  });

  it.each([
    () => Promise.resolve(new Response('nope', { status: 500 })),
    () =>
      Promise.resolve(
        Response.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    () => Promise.reject(new TypeError('Failed to fetch')),
  ])(
    'shows the support message when saving fails unexpectedly',
    async (response) => {
      globalThis.fetch = response as typeof fetch;

      const { createApplicant } = useApplicants();
      await expect(
        createApplicant({
          name: 'Test',
          type: 'private',
          phoneNumber: '12345678',
          email: 'test@example.com',
          street: 'Vestergade',
          houseNumber: '1',
          postalCode: '8000',
          city: 'Aarhus C',
        }),
      ).rejects.toThrow(
        'Kunne ikke gemme ansøgeren. Prøv igen senere eller kontakt support.',
      );
    },
  );
});
