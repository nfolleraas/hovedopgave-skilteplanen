import { expect, test } from '@playwright/test';
import { actor, openActorStep, startApplication } from './actors.helpers';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/actors?*', (route) =>
    route.fulfill({ json: [actor] }),
  );
});

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
  await expect(
    page.getByRole('button', { name: actor.name, exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await openActorStep(page);
  await expect(
    page.getByText('Der er endnu ingen aktører på ansøgningen.'),
  ).toBeVisible();
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
