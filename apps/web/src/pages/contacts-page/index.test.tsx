import { afterEach, describe, expect, test } from 'bun:test';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  buildActor,
  buildContactPerson,
  FakeContactPersonsApi,
} from '../../test/fake-contact-persons-api.js';
import { renderWithProviders } from '../../test/render.js';
import type { ContactPersonApplication } from '../../types/contact-person.types.js';
import { ActorRole } from '../../types/prisma-enums.js';
import ContactsPage from './index.js';

const contractor = buildActor('actor-1', {
  name: 'Graveselskabet A/S',
  role: ActorRole.Contractor,
});
const networkOperator = buildActor('actor-2', {
  name: 'Fiberselskabet A/S',
  role: ActorRole.NetworkOperator,
});

let api: FakeContactPersonsApi | null = null;

afterEach(() => {
  api?.restore();
  api = null;
});

/** Opens /kontaktpersoner?sag=APP-1 with the fake API installed. */
async function renderPage(
  setup: (api: FakeContactPersonsApi) => void = () => {},
  application?: ContactPersonApplication,
) {
  api = new FakeContactPersonsApi(application).install();
  setup(api);
  window.history.replaceState(null, '', '/kontaktpersoner?sag=APP-1');
  const user = userEvent.setup();
  renderWithProviders(<ContactsPage />);
  await screen.findByRole('heading', { name: 'Kontaktpersoner' });
  return { user, api };
}

function field(name: RegExp) {
  return screen.getByRole('textbox', { name });
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  select: RegExp,
  option: string,
) {
  await user.click(screen.getByRole('combobox', { name: select }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(/Navn/), 'Jens Jensen');
  await choose(user, /Tilgængelighed/, 'Aften');
  await user.type(field(/Telefonnr/), '12345678');
  await user.type(field(/E-mail/), 'jens@example.com');
}

describe('ContactsPage', () => {
  test('creates a contact person for the chosen actor (UC-031)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor, networkOperator),
    );

    await choose(user, /Aktør/, 'Fiberselskabet A/S (Ledningsejer)');
    await user.click(
      screen.getByRole('button', { name: '+ Opret kontaktperson' }),
    );
    await fillContact(user);
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    expect(
      await screen.findByText('Kontaktperson 1 Jens Jensen er gemt.'),
    ).toBeTruthy();
    expect(api.changes()).toEqual([
      {
        method: 'POST',
        path: '/api/contact-persons',
        body: {
          applicationId: 'APP-1',
          actorId: 'actor-2',
          name: 'Jens Jensen',
          availability: 'Evening',
          phoneNumber: '12345678',
          email: 'jens@example.com',
        },
      },
    ]);
    expect(
      screen.getByText('Aktør: Fiberselskabet A/S (Ledningsejer)'),
    ).toBeTruthy();
  });

  test('shows the validation errors and sends nothing (UC-031 F1 to F4)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor),
    );

    await user.click(
      screen.getByRole('button', { name: '+ Opret kontaktperson' }),
    );
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    // Name, availability, phone number and email are all required.
    expect(screen.getAllByText('Skal udfyldes')).toHaveLength(4);

    await user.type(field(/Telefonnr/), '1234');
    await user.type(field(/E-mail/), 'jens@');
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    expect(
      screen.getByText('Telefonnr. må kun indeholde tal og skal være 8 cifre'),
    ).toBeTruthy();
    expect(
      screen.getByText('E-mail skal have korrekt e-mailformatering'),
    ).toBeTruthy();
    expect(api.changes()).toEqual([]);
  });

  test('cancelling a new contact person removes it', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor),
    );

    await user.click(
      screen.getByRole('button', { name: '+ Opret kontaktperson' }),
    );
    await user.type(field(/Navn/), 'Jens Jensen');
    await user.click(screen.getByRole('button', { name: 'Annuller' }));

    expect(screen.queryByRole('textbox', { name: /Navn/ })).toBeNull();
    expect(
      screen.getByText('Der er ingen kontaktpersoner på ansøgningen endnu.'),
    ).toBeTruthy();
    expect(api.changes()).toEqual([]);
  });

  test('cancelling an edit keeps the saved details (UC-033 A4)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Redigér Kontaktperson 1 Jens Jensen',
      }),
    );
    await user.clear(field(/Navn/));
    await user.type(field(/Navn/), 'Ny Kontakt');
    await user.click(screen.getByRole('button', { name: 'Annuller' }));
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    // Cancel restores the saved values, so saving sends the original name.
    expect(api.changes()).toEqual([
      {
        method: 'PATCH',
        path: '/api/contact-persons/contact-1',
        body: {
          name: 'Jens Jensen',
          availability: 'Day',
          phoneNumber: '12345678',
          email: 'jens@example.com',
        },
      },
    ]);
  });

  test('saves an edited contact person (UC-033)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Redigér Kontaktperson 1 Jens Jensen',
      }),
    );
    await user.clear(field(/Telefonnr/));
    await user.type(field(/Telefonnr/), '87654321');
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    expect(
      await screen.findByText('Kontaktperson 1 Jens Jensen er gemt.'),
    ).toBeTruthy();
    expect(api.stored('contact-1')?.phoneNumber).toBe('87654321');
  });

  test('cancelling the delete dialog keeps the contact person (UC-032 A1)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(
      screen.getByRole('button', { name: 'Slet Kontaktperson 1 Jens Jensen' }),
    );
    const dialog = await screen.findByRole('dialog');
    // UC-032 step 3: the dialog shows the contact person's details.
    expect(dialog.textContent).toContain(
      'Aktør: Graveselskabet A/S (Entreprenør)',
    );
    expect(dialog.textContent).toContain('Telefonnr.: 12345678');
    await user.click(within(dialog).getByRole('button', { name: 'Annuller' }));

    expect(api.changes()).toEqual([]);
    expect(api.stored('contact-1')).toBeDefined();
  });

  test('deletes the contact person after confirmation (UC-032)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(
      screen.getByRole('button', { name: 'Slet Kontaktperson 1 Jens Jensen' }),
    );
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Slet',
      }),
    );

    expect(
      await screen.findByText('Kontaktpersonen Jens Jensen er slettet.'),
    ).toBeTruthy();
    expect(api.changes()).toEqual([
      {
        method: 'DELETE',
        path: '/api/contact-persons/contact-1',
        body: undefined,
      },
    ]);
    expect(api.stored('contact-1')).toBeUndefined();
  });

  test.each([
    [
      'APPLICATION_NOT_EDITABLE',
      'Kontaktpersoner kan kun ændres, mens ansøgningen er en kladde eller kræver rettelser.',
    ],
    [
      'ACTOR_NOT_FOUND',
      'Aktøren findes ikke længere på ansøgningen. Genindlæs siden.',
    ],
    [
      'SOMETHING_ELSE',
      'Kontaktpersonen kunne ikke gemmes, prøv igen senere eller kontakt supporten.',
    ],
  ])(
    'shows %s from the API in Danish and keeps the input (UC-031 F5)',
    async (code, message) => {
      const { user, api } = await renderPage((fake) =>
        fake.withActors(contractor),
      );

      await user.click(
        screen.getByRole('button', { name: '+ Opret kontaktperson' }),
      );
      await fillContact(user);
      api.failNext(409, { code });
      await user.click(
        screen.getByRole('button', { name: 'Gem kontaktperson' }),
      );

      expect(await screen.findByText(message)).toBeTruthy();
      expect((field(/Navn/) as HTMLInputElement).value).toBe('Jens Jensen');
    },
  );

  test('shows the delete error in the dialog (UC-032 F1)', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(
      screen.getByRole('button', { name: 'Slet Kontaktperson 1 Jens Jensen' }),
    );
    api.failNext(500);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Slet',
      }),
    );

    expect(
      await screen.findByText(
        'Kontaktpersonen kunne ikke slettes, prøv igen senere eller kontakt supporten.',
      ),
    ).toBeTruthy();
    expect(api.stored('contact-1')).toBeDefined();
  });

  test('says so when the application has no actors', async () => {
    await renderPage();

    expect(
      screen.getByText(
        'Ansøgningen har ingen aktører endnu. Opret en aktør, før du opretter en kontaktperson.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '+ Opret kontaktperson' }),
    ).toBeNull();
  });

  test('adds another contact person to an actor that has one', async () => {
    const { user, api } = await renderPage((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(
      screen.getByRole('button', { name: '+ Opret kontaktperson' }),
    );
    await user.type(field(/Navn/), 'Mette Hansen');
    await choose(user, /Tilgængelighed/, 'Nat');
    await user.type(field(/Telefonnr/), '87654321');
    await user.type(field(/E-mail/), 'mette@example.com');
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    expect(
      await screen.findByText('Kontaktperson 2 Mette Hansen er gemt.'),
    ).toBeTruthy();
    expect(api.changes()[0]?.body).toMatchObject({ actorId: 'actor-1' });
    expect(
      screen.getAllByText('Aktør: Graveselskabet A/S (Entreprenør)'),
    ).toHaveLength(2);
  });

  test('road use applications do not send an availability (UC-031 A1)', async () => {
    const { user, api } = await renderPage(
      (fake) => fake.withActors(contractor),
      { caseNumber: 'APP-1', type: 'RoadUsePermit', status: 'Draft' },
    );

    await user.click(
      screen.getByRole('button', { name: '+ Opret kontaktperson' }),
    );
    expect(
      screen.getByText(
        'Tilgængelighed er sat til dag for råden over vej-ansøgninger.',
      ),
    ).toBeTruthy();
    await user.type(field(/Navn/), 'Jens Jensen');
    await user.type(field(/Telefonnr/), '12345678');
    await user.type(field(/E-mail/), 'jens@example.com');
    await user.click(screen.getByRole('button', { name: 'Gem kontaktperson' }));

    await screen.findByText('Kontaktperson 1 Jens Jensen er gemt.');
    expect(api.changes()[0]?.body).not.toHaveProperty('availability');
  });

  test('is read-only when the application cannot be edited', async () => {
    await renderPage(
      (fake) =>
        fake.withActors(contractor).seed(buildContactPerson('contact-1')),
      { caseNumber: 'APP-1', type: 'ExcavationPermit', status: 'Approved' },
    );

    expect(screen.getByText('Kontaktperson 1 Jens Jensen')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Redigér/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Slet/ })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Aktør/ })).toBeNull();
  });

  test('shows a Danish message when the application does not exist', async () => {
    api = new FakeContactPersonsApi().install();
    api.failNext(404, { code: 'APPLICATION_NOT_FOUND' });
    window.history.replaceState(null, '', '/kontaktpersoner?sag=MISSING');
    renderWithProviders(<ContactsPage />);

    expect(
      await screen.findByText('Ansøgningen blev ikke fundet.'),
    ).toBeTruthy();
  });
});
