import { expect, test } from '@playwright/test';
import { municipality } from './municipality.fixture';

test('creates a municipality from the administrator form', async ({ page }) => {
  await page.route('**/api/addresses/search?**', (route) =>
    route.fulfill({
      json: [
        {
          id: municipality.addressId,
          titel: 'Vestergade 2, 5000 Odense C',
          type: 'husnummer',
        },
      ],
    }),
  );

  await page.route('**/api/municipalities', (route) =>
    route.fulfill({ status: 201, json: municipality }),
  );

  await page.goto('/admin/kommuner/opret');
  await expect(
    page.getByRole('heading', { name: 'Opret kommune' }),
  ).toBeVisible();

  const name = page.getByRole('textbox', { name: 'Kommunens navn' });
  const region = page.getByRole('combobox', { name: 'Region' });
  const address = page.getByRole('combobox', { name: 'Adresse' });
  for (const invalidName of ['Ærø 2', 'Ærø 😊', 'Ærø-Kommune']) {
    await name.fill(invalidName);
    expect(
      await name.evaluate(
        (input: HTMLInputElement) => input.validity.patternMismatch,
      ),
    ).toBe(true);
  }
  await name.fill('Ærø Kommune');
  expect(
    await name.evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(true);
  await name.fill(municipality.name);
  await region.click();
  await page.getByRole('option', { name: municipality.region }).click();
  await page
    .getByRole('textbox', { name: 'Telefonnummer' })
    .fill(municipality.phoneNumber);
  await page.getByRole('textbox', { name: 'E-mail' }).fill(municipality.email);
  await address.fill('Vestergade 2');
  await page
    .getByRole('option', { name: 'Vestergade 2, 5000 Odense C' })
    .click();

  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      request.url().endsWith('/api/municipalities'),
  );
  await page.getByRole('button', { name: 'Gem kommune' }).click();

  expect((await requestPromise).postDataJSON()).toEqual({
    name: municipality.name,
    region: municipality.region,
    phoneNumber: municipality.phoneNumber,
    email: municipality.email,
    address: {
      street: 'Vestergade',
      houseNumber: '2',
      postalCode: '5000',
      city: 'Odense C',
    },
  });
  await expect(page.getByRole('alert')).toHaveText('Kommunen er oprettet');
  await expect(name).toHaveValue('');
  await expect(address).toHaveValue('');
});
