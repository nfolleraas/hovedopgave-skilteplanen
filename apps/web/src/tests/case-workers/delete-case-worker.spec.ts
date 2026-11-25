import { expect, test } from '@playwright/test';

const workerEndpoint = '**/api/case-workers/SB001';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/case-workers', (route) =>
    route.fulfill({
      json: [
        {
          employeeNumber: 'SB001',
          name: 'Anne Müller',
          email: 'anne@example.test',
          phoneNumber: '12345678',
          isSuperUser: false,
          municipalityId: 1,
        },
      ],
    }),
  );
  await page.goto('/sagsbehandler/kommuner/1/sagsbehandlere');
});

test('removes a caseworker only after confirmation', async ({ page }) => {
  const row = page.getByRole('row', { name: /SB001/ });
  let deleteRequests = 0;
  await page.route(workerEndpoint, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    deleteRequests += 1;
    await route.fulfill({ status: 204 });
  });

  await row.getByRole('button', { name: 'Slet' }).click();
  const dialog = page.getByRole('dialog', { name: 'Slet sagsbehandler' });
  await expect(dialog).toContainText(
    'Er du sikker på, at du vil slette Anne Müller?',
  );
  await dialog.getByRole('button', { name: 'Annuller' }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
  expect(deleteRequests).toBe(0);

  await row.getByRole('button', { name: 'Slet' }).click();
  await dialog.getByRole('button', { name: 'Slet' }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toHaveCount(0);
  expect(deleteRequests).toBe(1);
});

test('keeps the caseworker when the API rejects deletion', async ({ page }) => {
  const row = page.getByRole('row', { name: /SB001/ });
  await page.route(workerEndpoint, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    await route.fulfill({ status: 409 });
  });

  await row.getByRole('button', { name: 'Slet' }).click();
  const dialog = page.getByRole('dialog', { name: 'Slet sagsbehandler' });
  await dialog.getByRole('button', { name: 'Slet' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Sagsbehandleren kan ikke slettes, fordi det ville bryde en regel.',
  );
  await dialog.getByRole('button', { name: 'Annuller' }).click();
  await expect(row).toBeVisible();
});
