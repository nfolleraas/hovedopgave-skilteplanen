import { expect, test } from '@playwright/test';
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

test.beforeEach(async ({ page }) => {
  await page.route('**/api/actors', (route) =>
    route.fulfill({ json: [actor] }),
  );
});

test('navigation opens actors and expands their details', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Ansøgning', exact: true }).click();
  await expect(page).toHaveURL('/ansoegning');
  const toggle = page.getByRole('button', { name: actor.name, exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(actor.email, { exact: true })).toBeVisible();
  await expect(page.getByText('Vestergade 10, 5000 Odense C')).toBeVisible();
  await toggle.click();
  await expect(page.getByText(actor.email, { exact: true })).toBeHidden();
});

test('empty list allows creation, validates input, and cancels to selected application', async ({
  page,
}) => {
  await page.route('**/api/actors', (route) => route.fulfill({ json: [] }));
  await page.goto('/ansoegning/DEMO-2026-0001');
  await expect(
    page.getByText('Der er endnu ingen aktører på ansøgningen.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Opret aktør', exact: true }).click();
  await expect(page).toHaveURL('/ansoegning/DEMO-2026-0001/actors/create');
  await page.getByRole('button', { name: 'Gem aktør', exact: true }).click();
  await expect(page.getByText('Vælg en rolle.', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Rolle' })).toBeFocused();
  await page.getByRole('button', { name: 'Annuller', exact: true }).click();
  await expect(page).toHaveURL('/ansoegning/DEMO-2026-0001');
});

test('failed actor load can be retried', async ({ page }) => {
  let unavailable = true;
  await page.route('**/api/actors', (route) =>
    route.fulfill({
      status: unavailable ? 503 : 200,
      json: unavailable ? { message: 'Unavailable' } : [actor],
    }),
  );
  await page.goto('/ansoegning');
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
  await page.route('**/api/actors', (route) =>
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
  await page.goto('/ansoegning');
  await page.getByRole('button', { name: `Rediger ${actor.name}` }).click();
  await expect(page.getByRole('combobox', { name: 'Rolle' })).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Navn', exact: false })
    .fill('Anna Hansen');
  await page
    .getByRole('button', { name: 'Opdater aktør', exact: true })
    .click();
  await expect(page).toHaveURL('/ansoegning');
  await page.reload();
  await expect(
    page.getByRole('button', { name: saved.name, exact: true }),
  ).toBeVisible();
});

test('delete requires confirmation and restores focus after success', async ({
  page,
}) => {
  let deleted = false;
  await page.route('**/api/actors', (route) =>
    route.fulfill({ json: deleted ? [] : [actor] }),
  );
  await page.route(`**/api/actors/${actor.uuid}`, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    deleted = true;
    await route.fulfill({ status: 204 });
  });
  await page.goto('/ansoegning');
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
  await page.goto('/ansoegning');
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
