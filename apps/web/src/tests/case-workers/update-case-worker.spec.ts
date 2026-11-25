import { expect, test } from '@playwright/test';

test('updates a caseworker from the municipality list', async ({ page }) => {
  const worker = {
    employeeNumber: 'SB001',
    name: 'Anne Müller',
    email: 'anne@example.test',
    phoneNumber: '12345678',
    isSuperUser: false,
    municipalityId: 1,
  };
  await page.route('**/api/case-workers', (route) =>
    route.fulfill({ json: [worker] }),
  );
  await page.route('**/api/case-workers/SB001', async (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toEqual({
      name: 'Anne Jensen',
      email: worker.email,
      phoneNumber: worker.phoneNumber,
      isSuperUser: false,
    });
    await route.fulfill({ json: { ...worker, name: 'Anne Jensen' } });
  });

  await page.goto('/sagsbehandler/kommuner/1/sagsbehandlere');
  const row = page.getByRole('row', { name: /SB001/ });
  await row.getByRole('button', { name: 'Opdater' }).click();
  const dialog = page.getByRole('dialog', { name: 'Opdater sagsbehandler' });
  const name = dialog.getByRole('textbox', { name: 'Navn' });
  await expect(name).toHaveValue(worker.name);
  await name.fill('Anne Jensen');
  await dialog.getByRole('button', { name: 'Gem ændringer' }).click();

  await expect(dialog).toBeHidden();
  await expect(row).toContainText('Anne Jensen');
  await expect(page.getByRole('status')).toHaveText(
    'Anne Jensen er opdateret.',
  );
});
