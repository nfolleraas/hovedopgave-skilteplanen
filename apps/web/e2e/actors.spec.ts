import { expect, type Page, test } from '@playwright/test';
import type { SavedActor } from '../src/pages/actors-page/actor.types.js';

const actor: SavedActor = {
  uuid: '11111111-1111-4111-8111-111111111111',
  name: 'Anna Jensen',
  role: 'Private',
  phoneNumber: '12345678',
  email: 'anna@example.com',
  cvrNumber: null,
  department: null,
  address: {
    uuid: '22222222-2222-4222-8222-222222222222',
    street: 'Vestergade',
    houseNumber: '10',
    postalCode: '5000',
    city: 'Odense C',
  },
  contactPersons: [],
};

async function openActorStep(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Kommune & titel', exact: true }),
  ).toBeVisible();
  const steps = page.getByRole('navigation', { name: 'Ansøgningens trin' });
  if (!(await steps.isVisible())) {
    await page.getByRole('button', { name: 'Vis trin', exact: true }).click();
  }
  await steps.getByRole('button', { name: 'Aktør', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Aktør', exact: true }),
  ).toBeVisible();
}

/** Starts a real application draft before opening its embedded actor step. */
async function startApplication(page: Page): Promise<string> {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Hovednavigation' })
    .getByRole('link', { name: 'Ansøgning', exact: true })
    .click();
  await expect(page).toHaveURL('/ansoegning');
  await page
    .getByRole('button', {
      name: 'Opret tilladelse til råden over vej',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/ansoegning\/opret-vejtilladelse\?draft=.+/);
  const caseNumber = new URL(page.url()).searchParams.get('draft');
  if (!caseNumber) throw new Error('Application draft has no case number.');
  await openActorStep(page);
  return caseNumber;
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: [actor] }),
  );
});

test('navigation opens actors and expands their details', async ({ page }) => {
  const actorRequest = page.waitForRequest('**/api/actors?*');
  const caseNumber = await startApplication(page);
  expect(
    new URL((await actorRequest).url()).searchParams.get('caseNumber'),
  ).toBe(caseNumber);
  const toggle = page.getByRole('button', { name: actor.name, exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(actor.email, { exact: true })).toBeVisible();
  await expect(page.getByText('Vestergade 10, 5000 Odense C')).toBeVisible();
  await toggle.click();
  await expect(page.getByText(actor.email, { exact: true })).toBeHidden();
});

test('empty list allows creation, validates input, and cancels within the actor step', async ({
  page,
}) => {
  await page.route('**/api/actors?*', (route) => route.fulfill({ json: [] }));
  await startApplication(page);
  await expect(
    page.getByText('Der er endnu ingen aktører på ansøgningen.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Opret aktør', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Opret aktør' })).toBeVisible();
  await page.getByRole('button', { name: 'Gem aktør', exact: true }).click();
  await expect(page.getByText('Vælg en rolle.', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Rolle' })).toBeFocused();
  await page.getByRole('button', { name: 'Annuller', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Aktør', exact: true }),
  ).toBeVisible();
});

test('creates an actor for the current application without leaving its step', async ({
  page,
}) => {
  await page.route('**/api/actors?*', (route) => route.fulfill({ json: [] }));
  await page.route('**/address-lookup/husnumre/soeg?*', (route) =>
    route.fulfill({
      json: {
        status: 'ok',
        fund: [
          {
            type: 'husnummer',
            id: actor.address.uuid,
            titel: 'Vestergade 10, 5000 Odense C',
          },
        ],
      },
    }),
  );
  await page.route(
    `**/address-lookup/husnumre/${actor.address.uuid}`,
    (route) =>
      route.fulfill({
        json: {
          status: 'ok',
          husnummer: {
            status: '3',
            vejnavn: actor.address.street,
            husnummertekst: actor.address.houseNumber,
            postnummer: {
              postnr: actor.address.postalCode,
              navn: actor.address.city,
            },
          },
        },
      }),
  );
  const caseNumber = await startApplication(page);
  const applicationURL = page.url();
  await page.route('**/api/actors', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toMatchObject({
      applicationCaseNumber: caseNumber,
      role: actor.role,
      name: actor.name,
      email: actor.email,
      phoneNumber: actor.phoneNumber,
    });
    await route.fulfill({ status: 201, json: actor });
  });
  await page.getByRole('button', { name: 'Opret aktør', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Opret aktør' });
  await editor.getByRole('combobox', { name: 'Rolle' }).click();
  await page.getByRole('option', { name: 'Privat', exact: true }).click();
  await editor
    .getByRole('textbox', { name: 'Navn', exact: false })
    .fill(actor.name);
  await editor
    .getByRole('textbox', { name: 'Telefonnummer' })
    .fill(actor.phoneNumber);
  await editor
    .getByRole('textbox', { name: 'E-mail', exact: false })
    .fill(actor.email);
  await editor
    .getByRole('combobox', { name: 'Adresse', exact: false })
    .fill('Vestergade');
  const lookup = page.waitForResponse(
    `**/address-lookup/husnumre/${actor.address.uuid}`,
  );
  await page
    .getByRole('option', { name: 'Vestergade 10, 5000 Odense C' })
    .click();
  await lookup;
  await editor.getByRole('button', { name: 'Gem aktør', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: actor.name, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(applicationURL);
});

test('placeholder application routes are no longer available', async ({
  page,
}) => {
  for (const path of [
    '/ansoegning/legacy-case',
    '/ansoegning/legacy-case/actors/create',
    `/ansoegning/legacy-case/actors/${actor.uuid}/edit`,
    '/ansoegning/actors/create',
    `/ansoegning/actors/${actor.uuid}/edit`,
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Siden blev ikke fundet' }),
    ).toBeVisible();
  }
});

test('failed actor load can be retried', async ({ page }) => {
  let unavailable = true;
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({
      status: unavailable ? 503 : 200,
      json: unavailable ? { message: 'Unavailable' } : [actor],
    }),
  );
  await startApplication(page);
  await expect(page.getByRole('alert')).toContainText(
    'Aktørerne kunne ikke hentes.',
  );
  await expect(
    page.getByRole('button', { name: 'Opret aktør', exact: true }),
  ).toBeDisabled();
  unavailable = false;
  await page.getByRole('button', { name: 'Prøv igen' }).click();
  await expect(
    page.getByRole('button', { name: actor.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('edit saves changed details and returns to the actor list', async ({
  page,
}) => {
  let saved = actor;
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: [saved] }),
  );
  await page.route(`**/api/actors/${actor.uuid}`, async (route) => {
    expect(route.request().method()).toBe('PATCH');
    const payload = route.request().postDataJSON();
    expect(payload.name).toBe('Anna Hansen');
    expect(payload).not.toHaveProperty('role');
    saved = { ...actor, name: payload.name };
    await route.fulfill({ json: saved });
  });
  await startApplication(page);
  await page.getByRole('button', { name: `Opdater ${actor.name}` }).click();
  await expect(page.getByRole('combobox', { name: 'Rolle' })).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Navn', exact: false })
    .fill('Anna Hansen');
  await page
    .getByRole('button', { name: 'Opdater aktør', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await openActorStep(page);
  await expect(
    page.getByRole('button', { name: saved.name, exact: true }),
  ).toBeVisible();
});

test('updating a deleted actor asks the user to refresh and keeps their input', async ({
  page,
}) => {
  await page.route(`**/api/actors/${actor.uuid}`, (route) =>
    route.fulfill({ status: 404, json: { message: 'Actor not found' } }),
  );
  await startApplication(page);
  await page.getByRole('button', { name: `Opdater ${actor.name}` }).click();
  const name = page.getByRole('textbox', { name: 'Navn', exact: false });
  await name.fill('Anna Hansen');
  await page
    .getByRole('button', { name: 'Opdater aktør', exact: true })
    .click();
  await expect(page.getByRole('alert')).toHaveText(
    'Aktøren findes ikke længere. Opdater siden.',
  );
  await expect(name).toHaveValue('Anna Hansen');
  await expect(
    page.getByRole('button', { name: 'Opdater aktør', exact: true }),
  ).toBeEnabled();
});

test('business actor saves only after CVR API confirmation', async ({
  page,
}) => {
  const businessActor: SavedActor = {
    ...actor,
    role: 'Supplier',
    cvrNumber: '12345678',
    department: 'Anlæg',
  };
  let lookupStatus = 404;
  let saves = 0;
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: [businessActor] }),
  );
  await page.route('https://apicvr.dk/api/v1/12345678', (route) =>
    route.fulfill({
      status: lookupStatus,
      json:
        lookupStatus === 200
          ? { vat: 12345678, name: businessActor.name }
          : { message: 'Lookup failed' },
    }),
  );
  await page.route(`**/api/actors/${actor.uuid}`, async (route) => {
    expect(route.request().method()).toBe('PATCH');
    saves++;
    await route.fulfill({ json: businessActor });
  });
  await startApplication(page);
  await page.getByRole('button', { name: `Opdater ${actor.name}` }).click();
  const save = page.getByRole('button', { name: 'Opdater aktør', exact: true });
  for (const status of [404, 502]) {
    lookupStatus = status;
    await save.click();
    await expect(page.getByText(/CVR-nummeret skal bekræftes/)).toBeVisible();
    await expect(save).toBeEnabled();
    expect(saves).toBe(0);
  }
  lookupStatus = 200;
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(saves).toBe(1);
});

for (const field of ['email', 'cvrNumber'] as const) {
  test(`duplicate ${field} is displayed on the actor form`, async ({
    page,
  }) => {
    const existing: SavedActor =
      field === 'email'
        ? actor
        : {
            ...actor,
            role: 'Supplier',
            cvrNumber: '12345678',
            department: 'Anlæg',
          };
    await page.route('**/api/actors?*', (route) =>
      route.fulfill({ json: [existing] }),
    );
    await page.route('https://apicvr.dk/api/v1/12345678', (route) =>
      route.fulfill({ json: { vat: 12345678, name: existing.name } }),
    );
    const message =
      field === 'email'
        ? 'En aktør med denne e-mailadresse findes allerede på ansøgningen.'
        : 'En aktør med dette CVR-nummer findes allerede på ansøgningen.';
    await page.route(`**/api/actors/${actor.uuid}`, (route) =>
      route.fulfill({ status: 409, json: { field, message } }),
    );
    await startApplication(page);
    await page.getByRole('button', { name: `Opdater ${actor.name}` }).click();
    await page
      .getByRole('button', { name: 'Opdater aktør', exact: true })
      .click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    const input = page.locator(`input[name="${field}"]`);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveValue(existing[field] as string);
    await expect(
      page.getByText('Aktøren kunne ikke gemmes.', { exact: false }),
    ).toBeHidden();
  });
}

test('delete requires confirmation and restores focus after success', async ({
  page,
}) => {
  let deleted = false;
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: deleted ? [] : [actor] }),
  );
  await page.route(`**/api/actors/${actor.uuid}`, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    deleted = true;
    await route.fulfill({ status: 204 });
  });
  await startApplication(page);
  await page.getByRole('button', { name: `Slet ${actor.name}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Bekræft sletning' });
  await expect(dialog).toContainText(actor.name);
  await dialog.getByRole('button', { name: 'Annuller' }).click();
  await expect(dialog).toBeHidden();
  expect(deleted).toBe(false);
  await page.getByRole('button', { name: `Slet ${actor.name}` }).click();
  await dialog.getByRole('button', { name: 'Slet', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText('Der er endnu ingen aktører på ansøgningen.'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Opret aktør', exact: true }),
  ).toBeFocused();
  expect(deleted).toBe(true);
});

test('failed deletion keeps the actor and allows retry', async ({ page }) => {
  await page.route(`**/api/actors/${actor.uuid}`, (route) =>
    route.fulfill({ status: 500, json: { message: 'Unavailable' } }),
  );
  await startApplication(page);
  await page.getByRole('button', { name: `Slet ${actor.name}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Slet', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Aktøren kunne ikke slettes. Prøv igen.',
  );
  await expect(
    dialog.getByRole('button', { name: 'Slet', exact: true }),
  ).toBeEnabled();
  await dialog.getByRole('button', { name: 'Annuller' }).click();
  await expect(
    page.getByRole('button', { name: actor.name, exact: true }),
  ).toBeVisible();
});
