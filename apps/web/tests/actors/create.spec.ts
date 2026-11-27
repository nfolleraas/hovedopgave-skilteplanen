import { expect, test } from '@playwright/test';
import { actor, openActorStep, startApplication } from './actors.helpers';

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
  let created = false;
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: created ? [actor] : [] }),
  );
  await page.route('https://adressevaelger.dk/husnumre/soeg?*', (route) =>
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
    `https://adressevaelger.dk/husnumre/${actor.address.uuid}?*`,
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
      address: {
        street: actor.address.street,
        houseNumber: actor.address.houseNumber,
        postalCode: actor.address.postalCode,
        city: actor.address.city,
      },
    });
    created = true;
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
    `https://adressevaelger.dk/husnumre/${actor.address.uuid}?*`,
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
  expect(created).toBe(true);
  await page.reload();
  await openActorStep(page);
  await expect(
    page.getByRole('button', { name: actor.name, exact: true }),
  ).toBeVisible();
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
