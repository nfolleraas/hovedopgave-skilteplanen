import { expect, test } from '@playwright/test';

const address = 'Vestergade 1, 8000 Aarhus C';

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
    // Keep the external address provider out of the test run.
    await page.route('**/api/addresses/search?*', (request) =>
      request.fulfill({
        json: [{ id: 'test-address', titel: address, type: 'adresse' }],
      }),
    );

    await page.goto(route);
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Navn', exact: true })
      .fill(heading);
    await page.getByRole('textbox', { name: 'Telefonnummer' }).fill('12345678');
    await page
      .getByRole('textbox', { name: 'E-mail' })
      .fill(`${applicantType.toLowerCase()}@example.com`);
    await page.getByRole('combobox', { name: 'Adresse' }).fill('Vestergade');
    await page.getByRole('option', { name: address }).click();

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

test('opens a private profile, cancels, validates and saves changes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Åbn brugermenu' }).click();
  await page.getByRole('menuitem', { name: 'Profil' }).click();
  await expect(page.getByText('Oprindeligt Profilnavn')).toBeVisible();
  await expect(page.getByText('CVR-nr.', { exact: true })).toHaveCount(0);

  const edit = page.getByRole('button', { name: 'Redigér profil' });
  const name = page.getByRole('textbox', { name: 'Navn', exact: true });
  await edit.click();
  await name.fill('Annulleret navn');
  await page.getByRole('button', { name: 'Annullér' }).click();
  await expect(page.getByText('Oprindeligt Profilnavn')).toBeVisible();

  await edit.click();
  const phone = page.getByRole('textbox', { name: 'Telefonnummer' });
  const save = page.getByRole('button', { name: 'Gem', exact: true });
  await name.fill('Opdateret Profilnavn');
  await phone.fill('123');
  await save.click();
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveValue('Opdateret Profilnavn');

  await phone.fill('87654321');
  await save.click();
  await expect(page.getByText('Profilen er opdateret.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Opdateret Profilnavn')).toBeVisible();
  await expect(page.getByText('87654321')).toBeVisible();
});
