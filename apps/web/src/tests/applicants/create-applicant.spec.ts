import { expect, test } from '@playwright/test';

const address = 'Vestergade 1, 8000 Aarhus C';

test.beforeEach(async ({ page }) => {
  await page.route('https://adressevaelger.dk/husnumre/soeg?*', (route) => {
    const query = new URL(route.request().url()).searchParams.get('tekst');
    return route.fulfill({
      json: {
        status: 'ok',
        fund: query?.startsWith('Ve')
          ? [
              { titel: 'Vestergade', type: 'navngivenvejpostnummer' },
              { id: 'test-house', titel: address, type: 'husnummer' },
            ]
          : [],
      },
    });
  });
});

for (const { route, applicantType, heading } of [
  {
    route: '/opret-privat',
    applicantType: 'Private',
    heading: 'Opret privatansøger',
  },
  {
    route: '/opret-erhverv',
    applicantType: 'Business',
    heading: 'Opret erhvervsansøger',
  },
]) {
  test(`creates a ${applicantType} applicant from the browser`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
    const name = page.getByRole('textbox', { name: 'Navn', exact: true });
    const email = page.getByRole('textbox', { name: 'E-mail' });
    await name.fill('Søren 😊');
    expect(
      await name.evaluate((input: HTMLInputElement) => input.validity.valid),
    ).toBe(false);
    await email.fill('kontakt😊@example.dk');
    expect(
      await email.evaluate((input: HTMLInputElement) => input.validity.valid),
    ).toBe(false);
    await name.fill(heading);
    await page.getByRole('textbox', { name: 'Telefonnummer' }).fill('12345678');
    await email.fill(`${applicantType.toLowerCase()}+test@example.com`);
    const addressField = page.getByRole('combobox', { name: 'Adresse' });
    await addressField.fill('Ve');
    await page.getByRole('option', { name: 'Vestergade', exact: true }).click();
    await expect(addressField).toHaveValue('Vestergade');
    await addressField.fill('Vestergade 1');
    await page.getByRole('option', { name: address, exact: true }).click();

    const cvr = page.getByRole('textbox', { name: 'CVR-nummer' });
    if (applicantType === 'Business') {
      await cvr.fill('12345678');
    } else {
      await expect(cvr).toHaveCount(0);
    }

    const saved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/applicants' &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Gem ansøger' }).click();
    const response = await saved;
    expect(response.status()).toBe(201);
    expect(await response.json()).toMatchObject({
      name: heading,
      type: applicantType,
      cvrNumber: applicantType === 'Business' ? '12345678' : null,
    });
    await expect(page).toHaveURL('/');
  });
}

test('shows support messages when address lookup or saving fails', async ({
  page,
}) => {
  await page.route('**/api/applicants', (request) =>
    request.fulfill({
      status: 500,
      json: { message: 'Internal server error' },
    }),
  );

  await page.goto('/opret-privat');
  const addressField = page.getByRole('combobox', { name: 'Adresse' });
  await addressField.fill('Xyzqvej');
  await expect(
    page.getByText('Ugyldig adresse. Prøv igen senere eller kontakt support.'),
  ).toBeVisible();
  await addressField.fill('Vestergade');
  await page.getByRole('option', { name: address }).click();

  const email = page.getByRole('textbox', { name: 'E-mail' });
  await page
    .getByRole('textbox', { name: 'Navn', exact: true })
    .fill('Søren Ærø');
  await page.getByRole('textbox', { name: 'Telefonnummer' }).fill('12345678');
  await email.fill('test@example.dk');
  await page.getByRole('button', { name: 'Gem ansøger' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Kunne ikke gemme ansøgeren. Prøv igen senere eller kontakt support.',
  );
  await expect(email).toHaveValue('test@example.dk');
});
