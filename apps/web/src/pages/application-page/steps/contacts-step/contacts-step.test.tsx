import { afterEach, describe, expect, test } from 'bun:test';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  buildActor,
  buildContactPerson,
  FakeContactPersonsApi,
} from '../../../../test/fake-contact-persons-api.js';
import { renderWithProviders } from '../../../../test/render.js';
import type { ContactPersonApplication } from '../../../../types/contact-person.types.js';
import { ActorRole } from '../../../../types/prisma-enums.js';
import ApplicationPage from '../../contact-wizard.js';

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
  // Each test starts with an empty draft in the wizard.
  sessionStorage.clear();
});

type User = ReturnType<typeof userEvent.setup>;

/** Opens the contacts step of APP-1 in the wizard with the fake API. */
async function renderStep(
  setup: (api: FakeContactPersonsApi) => void = () => {},
  application?: ContactPersonApplication,
) {
  api = new FakeContactPersonsApi(application).install();
  setup(api);
  window.history.replaceState(
    null,
    '',
    '/ansoegning?sag=APP-1&trin=contactInfo',
  );
  const user = userEvent.setup();
  renderWithProviders(<ApplicationPage />);
  await screen.findByRole('heading', { level: 1, name: 'Kontaktoplysninger' });
  return { user, api };
}

function field(name: RegExp) {
  return screen.getByRole('textbox', { name });
}

function button(name: string | RegExp) {
  return screen.getByRole('button', { name });
}

async function choose(user: User, select: RegExp, option: string) {
  await user.click(screen.getByRole('combobox', { name: select }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function fillContact(user: User) {
  await user.type(field(/Navn/), 'Jens Jensen');
  await choose(user, /Tilgængelighed/, 'Aften');
  await user.type(field(/Telefonnummer/), '12345678');
  await user.type(field(/E-mail/), 'jens@example.com');
}

async function confirmDelete(user: User) {
  await user.click(
    within(await screen.findByRole('dialog')).getByRole('button', {
      name: 'Slet',
    }),
  );
}

describe('ContactsStep', () => {
  test('creates a contact person for the chosen actor (UC-031)', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor, networkOperator),
    );

    await user.click(button('+ Tilføj kontaktperson'));
    expect(
      screen.getByRole('heading', { name: 'Ny kontaktperson' }),
    ).toBeTruthy();
    await choose(
      user,
      /Tilknyt til aktør/,
      'Fiberselskabet A/S (Ledningsejer)',
    );
    await fillContact(user);
    await user.click(button('Gem kontaktperson'));

    expect(
      await screen.findByText('Kontaktpersonen Jens Jensen er oprettet.'),
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
    // The new contact person is listed under its actor, and the form closes.
    expect(screen.getByText('Ledningsejer · Fiberselskabet A/S')).toBeTruthy();
    expect(screen.getByText('12 34 56 78')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /Navn/ })).toBeNull();
  });

  test('shows the validation errors and sends nothing (UC-031 F1 to F4)', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor),
    );

    await user.click(button('+ Tilføj kontaktperson'));
    await user.click(button('Gem kontaktperson'));

    expect(
      screen.getByText(
        'Kontaktpersonen kan ikke gemmes endnu. Ret felterne markeret med rødt.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Navn skal udfyldes')).toBeTruthy();
    expect(screen.getByText('Vælg en tilgængelighed')).toBeTruthy();
    expect(screen.getByText('Telefonnummer skal udfyldes')).toBeTruthy();
    expect(screen.getByText('E-mail skal udfyldes')).toBeTruthy();
    // Focus moves to the first invalid field.
    expect(document.activeElement).toBe(field(/Navn/));

    await user.type(field(/Telefonnummer/), '1234');
    await user.type(field(/E-mail/), 'jens@');
    await user.click(button('Gem kontaktperson'));

    expect(screen.getByText('Telefonnummer skal være 8 cifre')).toBeTruthy();
    expect(
      screen.getByText('Indtast en gyldig e-mailadresse, fx navn@firma.dk'),
    ).toBeTruthy();
    expect(api.changes()).toEqual([]);
  });

  test('cancelling a new contact person removes it', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor),
    );

    await user.click(button('+ Tilføj kontaktperson'));
    await user.type(field(/Navn/), 'Jens Jensen');
    await user.click(button('Annuller'));

    expect(screen.queryByRole('textbox', { name: /Navn/ })).toBeNull();
    expect(
      screen.getByText('Der er ingen kontaktpersoner endnu.'),
    ).toBeTruthy();
    expect(document.activeElement).toBe(button('+ Tilføj kontaktperson'));
    expect(api.changes()).toEqual([]);
  });

  test('cancelling an edit keeps the saved details', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(button('Redigér Jens Jensen'));
    await user.clear(field(/Navn/));
    await user.type(field(/Navn/), 'Ny Kontakt');
    await user.click(button('Annuller'));

    expect(screen.getByText('Jens Jensen')).toBeTruthy();
    await user.click(button('Redigér Jens Jensen'));
    expect((field(/Navn/) as HTMLInputElement).value).toBe('Jens Jensen');
    expect(api.changes()).toEqual([]);
  });

  test('saves an edited contact person (UC-033)', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(button('Redigér Jens Jensen'));
    expect(
      screen.getByRole('heading', { name: 'Rediger kontaktperson' }),
    ).toBeTruthy();
    // The actor of a saved contact person is shown but cannot be changed.
    expect((field(/^Aktør/) as HTMLInputElement).value).toBe(
      'Graveselskabet A/S (Entreprenør)',
    );
    await user.clear(field(/Telefonnummer/));
    await user.type(field(/Telefonnummer/), '87654321');
    await user.click(button('Gem ændringer'));

    expect(
      await screen.findByText('Ændringerne til Jens Jensen er gemt.'),
    ).toBeTruthy();
    expect(api.changes()).toEqual([
      {
        method: 'PATCH',
        path: '/api/contact-persons/contact-1',
        body: {
          name: 'Jens Jensen',
          availability: 'Day',
          phoneNumber: '87654321',
          email: 'jens@example.com',
        },
      },
    ]);
  });

  test('asks before opening another contact person over unsaved changes', async () => {
    const { user, api } = await renderStep((fake) =>
      fake
        .withActors(contractor)
        .seed(
          buildContactPerson('contact-1'),
          buildContactPerson('contact-2', { name: 'Mette Hansen' }),
        ),
    );

    await user.click(button('Redigér Jens Jensen'));
    await user.type(field(/Navn/), ' Jr.');
    await user.click(button('Redigér Mette Hansen'));

    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'Kassér ændringer' }),
    );

    // The page is hidden from assistive technology until the dialog closes.
    const name = await screen.findByRole('textbox', { name: /Navn/ });
    expect((name as HTMLInputElement).value).toBe('Mette Hansen');
    expect(api.changes()).toEqual([]);
  });

  test('cancelling the delete dialog keeps the contact person (UC-032 A1)', async () => {
    const { user, api } = await renderStep((fake) =>
      fake
        .withActors(contractor)
        .seed(
          buildContactPerson('contact-1'),
          buildContactPerson('contact-2', { name: 'Mette Hansen' }),
        ),
    );

    await user.click(button('Slet Jens Jensen'));
    const dialog = await screen.findByRole('dialog');
    // UC-032 step 4: the dialog shows the contact person's details.
    expect(dialog.textContent).toContain('Jens Jensen · Graveselskabet A/S');
    expect(dialog.textContent).toContain('Dag · 12 34 56 78');
    await user.click(within(dialog).getByRole('button', { name: 'Annuller' }));

    expect(api.changes()).toEqual([]);
    expect(api.stored('contact-1')).toBeDefined();
  });

  test('deletes the contact person after confirmation (UC-032)', async () => {
    const { user, api } = await renderStep((fake) =>
      fake
        .withActors(contractor)
        .seed(
          buildContactPerson('contact-1'),
          buildContactPerson('contact-2', { name: 'Mette Hansen' }),
        ),
    );

    await user.click(button('Slet Jens Jensen'));
    await confirmDelete(user);

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

  test('does not delete the last contact person (UC-032 F1)', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(button('Slet Jens Jensen'));

    expect(
      screen.getByText(
        'Der skal være mindst én kontaktperson på ansøgningen. Opret en ny kontaktperson, før du sletter denne.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.changes()).toEqual([]);
  });

  test.each([
    [
      'LAST_CONTACT_PERSON',
      'Der skal være mindst én kontaktperson på ansøgningen. Opret en ny kontaktperson, før du sletter denne.',
    ],
    [
      'SOMETHING_ELSE',
      'Kontaktpersonen kunne ikke slettes. Prøv igen senere eller kontakt supporten.',
    ],
  ])(
    'shows the delete error %s in the dialog (UC-032 F1, F4)',
    async (code, message) => {
      const { user, api } = await renderStep((fake) =>
        fake
          .withActors(contractor)
          .seed(
            buildContactPerson('contact-1'),
            buildContactPerson('contact-2', { name: 'Mette Hansen' }),
          ),
      );

      await user.click(button('Slet Jens Jensen'));
      api.failNext(400, { code });
      await confirmDelete(user);

      expect(
        await within(screen.getByRole('dialog')).findByText(message),
      ).toBeTruthy();
      expect(api.stored('contact-1')).toBeDefined();
    },
  );

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
      'CONTACT_PERSON_DUPLICATE',
      'Aktøren har allerede en kontaktperson med præcis de samme oplysninger.',
    ],
    [
      'CONTACT_PERSON_INVALID',
      'Oplysningerne blev afvist. Kontrollér felterne, og prøv igen.',
    ],
    [
      'SOMETHING_ELSE',
      'Kontaktpersonen kunne ikke gemmes. Prøv igen senere eller kontakt supporten.',
    ],
  ])(
    'shows %s from the API in Danish and keeps the input (UC-031 F5)',
    async (code, message) => {
      const { user, api } = await renderStep((fake) =>
        fake.withActors(contractor),
      );

      await user.click(button('+ Tilføj kontaktperson'));
      await fillContact(user);
      api.failNext(409, { code });
      await user.click(button('Gem kontaktperson'));

      expect(await screen.findByText(message)).toBeTruthy();
      expect((field(/Navn/) as HTMLInputElement).value).toBe('Jens Jensen');
    },
  );

  test('says so when the application has no actors', async () => {
    await renderStep();

    expect(
      screen.getByText(
        'Ansøgningen har ingen aktører endnu. Tilføj en aktør under »Øvrige aktører«, før du opretter en kontaktperson.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: '+ Tilføj kontaktperson' }),
    ).toBeNull();
  });

  test('adds another contact person to an actor that has one', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(button('+ Tilføj kontaktperson'));
    await user.type(field(/Navn/), 'Mette Hansen');
    await choose(user, /Tilgængelighed/, 'Nat');
    await user.type(field(/Telefonnummer/), '87654321');
    await user.type(field(/E-mail/), 'mette@example.com');
    await user.click(button('Gem kontaktperson'));

    expect(
      await screen.findByText('Kontaktpersonen Mette Hansen er oprettet.'),
    ).toBeTruthy();
    expect(api.changes()[0]?.body).toMatchObject({ actorId: 'actor-1' });
    expect(screen.getByText('Kontaktpersoner (2)')).toBeTruthy();
  });

  test('road use applications do not send an availability (UC-031 A1)', async () => {
    const { user, api } = await renderStep(
      (fake) => fake.withActors(contractor),
      { caseNumber: 'APP-1', type: 'RoadUsePermit', status: 'Draft' },
    );

    await user.click(button('+ Tilføj kontaktperson'));
    // Availability is always Day, so there is no field for it.
    expect(
      screen.queryByRole('combobox', { name: /Tilgængelighed/ }),
    ).toBeNull();
    expect(screen.queryByText(/Tilgængelighed/)).toBeNull();
    await user.type(field(/Navn/), 'Jens Jensen');
    await user.type(field(/Telefonnummer/), '12345678');
    await user.type(field(/E-mail/), 'jens@example.com');
    await user.click(button('Gem kontaktperson'));

    await screen.findByText('Kontaktpersonen Jens Jensen er oprettet.');
    expect(api.changes()[0]?.body).not.toHaveProperty('availability');
  });

  test('is read-only when the application cannot be edited', async () => {
    await renderStep(
      (fake) =>
        fake.withActors(contractor).seed(buildContactPerson('contact-1')),
      { caseNumber: 'APP-1', type: 'ExcavationPermit', status: 'Approved' },
    );

    expect(screen.getByText('Jens Jensen')).toBeTruthy();
    expect(
      screen.getByText(
        'Kontaktpersoner kan kun ændres, mens ansøgningen er en kladde eller kræver rettelser.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Redigér/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Slet/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: '+ Tilføj kontaktperson' }),
    ).toBeNull();
  });

  test('Next needs at least one contact person (UC-004 F7)', async () => {
    const { user } = await renderStep((fake) => fake.withActors(contractor));

    await user.click(button('Næste'));

    expect(
      screen.getByText(
        'Der skal være mindst én kontaktperson, før du kan gå videre.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Kontaktoplysninger' }),
    ).toBeTruthy();
  });

  test('Next saves the open form before moving on', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor),
    );

    await user.click(button('+ Tilføj kontaktperson'));
    await fillContact(user);
    await user.click(button('Næste'));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kort' }),
    ).toBeTruthy();
    expect(api.changes()).toHaveLength(1);
    expect(api.changes()[0]?.method).toBe('POST');
  });

  test('shows a Danish message when the application does not exist', async () => {
    api = new FakeContactPersonsApi().install();
    api.failNext(404, { code: 'APPLICATION_NOT_FOUND' });
    window.history.replaceState(null, '', '/ansoegning?sag=MISSING');
    renderWithProviders(<ApplicationPage />);

    expect(
      await screen.findByText('Ansøgningen blev ikke fundet.'),
    ).toBeTruthy();
  });
  test('shows a format error as soon as the field is left', async () => {
    const { user } = await renderStep((fake) => fake.withActors(contractor));

    await user.click(button('+ Tilføj kontaktperson'));
    // Leaving an empty field does not complain yet.
    await user.click(field(/Navn/));
    await user.tab();
    expect(screen.queryByText('Navn skal udfyldes')).toBeNull();

    await user.type(field(/Telefonnummer/), '1234');
    await user.tab();
    expect(screen.getByText('Telefonnummer skal være 8 cifre')).toBeTruthy();

    // The error goes away while typing the rest of the number.
    await user.type(field(/Telefonnummer/), '5678');
    expect(screen.queryByText('Telefonnummer skal være 8 cifre')).toBeNull();
  });

  test('cleans up a pasted phone number and email', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor),
    );

    await user.click(button('+ Tilføj kontaktperson'));
    await user.type(field(/Navn/), 'Jens Jensen');
    await choose(user, /Tilgængelighed/, 'Dag');
    await user.click(field(/Telefonnummer/));
    await user.paste('+45 22 33 44 55');
    await user.click(field(/E-mail/));
    await user.paste(' jens@example.com ');

    expect((field(/Telefonnummer/) as HTMLInputElement).value).toBe('22334455');
    await user.click(button('Gem kontaktperson'));

    await screen.findByText('Kontaktpersonen Jens Jensen er oprettet.');
    expect(api.changes()[0]?.body).toMatchObject({
      phoneNumber: '22334455',
      email: 'jens@example.com',
    });
  });

  test('a contact person deleted in another tab disappears without an error', async () => {
    const { user, api } = await renderStep((fake) =>
      fake
        .withActors(contractor)
        .seed(
          buildContactPerson('contact-1'),
          buildContactPerson('contact-2', { name: 'Mette Hansen' }),
        ),
    );

    await user.click(button('Slet Jens Jensen'));
    api.failNext(404, { code: 'CONTACT_PERSON_NOT_FOUND' });
    await confirmDelete(user);

    expect(
      await screen.findByText(
        'Kontaktpersonen Jens Jensen var allerede slettet.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Slet Jens Jensen' }),
    ).toBeNull();
  });

  test('says so when an edited contact person was deleted in another tab', async () => {
    const { user, api } = await renderStep((fake) =>
      fake.withActors(contractor).seed(buildContactPerson('contact-1')),
    );

    await user.click(button('Redigér Jens Jensen'));
    await user.type(field(/Navn/), ' Jr.');
    api.failNext(404, { code: 'CONTACT_PERSON_NOT_FOUND' });
    await user.click(button('Gem ændringer'));

    expect(
      await screen.findByText(
        'Kontaktpersonen findes ikke længere. Den kan være slettet i en anden fane. Genindlæs siden.',
      ),
    ).toBeTruthy();
    // The input is kept.
    expect((field(/Navn/) as HTMLInputElement).value).toBe('Jens Jensen Jr.');
  });
});
