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
    const emailAddress = `${applicantType.toLowerCase()}+test@example.com`;
    await email.fill(emailAddress);
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
      email: emailAddress,
      type: applicantType,
      cvrNumber: applicantType === 'Business' ? '12345678' : null,
    });
    await expect(page).toHaveURL('/');
  });
}

test('shows specific messages when no address matches or saving fails', async ({
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
  await expect(addressField).toHaveAccessibleDescription(
    'Ingen adresser fundet. Kontrollér vejnavn, husnummer eller postnummer.',
  );
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

test('shows validation errors beside the applicant fields', async ({
  page,
}) => {
  await page.goto('/opret-erhverv');
  await page.getByRole('button', { name: 'Gem ansøger' }).click();

  for (const [label, message] of [
    ['Navn', 'Indtast virksomhedens navn.'],
    ['Telefonnummer', 'Indtast et telefonnummer med præcis 8 cifre.'],
    ['E-mail', 'Indtast en gyldig e-mailadresse, fx navn@eksempel.dk.'],
    ['CVR-nummer', 'Indtast et CVR-nummer med præcis 8 cifre.'],
  ]) {
    const field = page.getByRole('textbox', { name: label, exact: true });
    await expect(field).toHaveAccessibleDescription(message);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(
    page.getByRole('combobox', { name: 'Adresse' }),
  ).toHaveAccessibleDescription('Vælg en adresse med husnummer fra listen.');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
