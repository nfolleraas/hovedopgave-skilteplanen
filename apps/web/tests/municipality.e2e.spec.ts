import { expect, test } from '@playwright/test';

const municipality = {
  id: 7,
  name: 'Testkommune',
  region: 'Region Syddanmark',
  email: 'kontakt@example.test',
  phoneNumber: '12345678',
  addressId: 'test-address',
  address: {
    uuid: 'test-address',
    street: 'Vestergade',
    houseNumber: '2',
    postalCode: '5000',
    city: 'Odense C',
  },
};

test('updates municipality details from the caseworker sidebar', async ({
  page,
}) => {
  await page.route('**/api/municipalities/7', async (route) => {
    const request = route.request();

    if (request.method() === 'PATCH') {
      await route.fulfill({
        json: {
          ...municipality,
          email: 'ny-kontakt@example.test',
        },
      });
      return;
    }

    await route.fulfill({ json: municipality });
  });

  await page.route('**/api/addresses/search?**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'new-address',
          titel: 'Vestergade 4, 5000 Odense C',
          type: 'husnummer',
        },
      ],
    }),
  );

  await page.goto('/sagsbehandler/kommuner/7');
  const sidebar = page.getByRole('navigation', { name: 'Sagsbehandling' });
  await sidebar
    .getByRole('link', { name: 'Opdater kommuneoplysninger' })
    .click();
  await expect(page).toHaveURL(/\/sagsbehandler\/kommuner\/7\/opdater$/);
  await expect(
    page.getByRole('heading', { name: 'Testkommune' }),
  ).toBeVisible();

  const email = page.getByRole('textbox', { name: 'E-mail' });
  const phone = page.getByRole('textbox', { name: 'Telefonnummer' });
  const address = page.getByRole('combobox', { name: 'Adresse' });
  const save = page.getByRole('button', { name: 'Gem ændringer' });
  const cancel = page.getByRole('button', { name: 'Annuller' });

  await expect(email).toHaveValue(municipality.email);
  await expect(address).toHaveValue('Vestergade 2, 5000 Odense C');
  await expect(save).toBeDisabled();

  await phone.fill('87654321');
  await expect(save).toBeEnabled();
  await phone.fill(municipality.phoneNumber);
  await expect(save).toBeDisabled();

  await address.fill('Vestergade 4');
  await expect(save).toBeDisabled();
  await page
    .getByRole('option', { name: 'Vestergade 4, 5000 Odense C' })
    .click();
  await expect(save).toBeEnabled();
  await cancel.click();
  await expect(address).toHaveValue('Vestergade 2, 5000 Odense C');
  await expect(save).toBeDisabled();

  await email.fill('kladde@example.test');
  await expect(save).toBeEnabled();
  await cancel.click();
  await expect(email).toHaveValue(municipality.email);
  await expect(save).toBeDisabled();

  await email.fill('ny-kontakt@example.test');
  const requestPromise = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' &&
      request.url().endsWith('/api/municipalities/7'),
  );
  await save.click();
  expect((await requestPromise).postDataJSON()).toEqual({
    email: 'ny-kontakt@example.test',
    phoneNumber: '12345678',
    address: {
      street: 'Vestergade',
      houseNumber: '2',
      postalCode: '5000',
      city: 'Odense C',
    },
  });
  await expect(page.getByText('Kommuneoplysningerne er gemt.')).toBeVisible();
  await expect(email).toHaveValue('ny-kontakt@example.test');
  await expect(save).toBeDisabled();
});

test('shows a specific validation error and keeps the draft when saving by keyboard', async ({
  page,
}) => {
  await page.route('**/api/municipalities/7', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({ status: 400, json: { code: 'invalidPostalCode' } });
      return;
    }

    await route.fulfill({ json: municipality });
  });

  await page.goto('/sagsbehandler/kommuner/7/opdater');
  await expect(
    page.getByRole('heading', { name: 'Testkommune' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Opdater kommuneoplysninger' }),
  ).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('textbox', { name: 'Telefonnummer' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const email = page.getByRole('textbox', { name: 'E-mail' });
  await expect(email).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('kladde@example.test');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Adresse' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Annuller' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Gem ændringer' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('alert')).toHaveText(
    'Vælg en adresse med et postnummer på 4 cifre.',
  );
  await expect(email).toHaveValue('kladde@example.test');
});
