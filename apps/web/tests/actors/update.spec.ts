import { expect, test } from '@playwright/test';
import type { SavedActor } from '../../src/pages/actors-page/actor.types.js';
import { actor, openActorStep, startApplication } from './actors.helpers';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: [actor] }),
  );
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
