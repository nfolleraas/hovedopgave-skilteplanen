import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { municipality } from './municipality.fixture';

test('persists a new municipality and caseworker edits through the API', async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_DATABASE_URL,
    'Requires a PostgreSQL test database',
  );

  const marker = randomUUID();
  const nameSuffix = marker
    .replaceAll('-', '')
    .replace(/\d/g, (digit) => 'ghijklmnop'.charAt(Number(digit)));
  const name = `Testkommune ${nameSuffix}`;
  const initialEmail = `initial-${marker}@example.test`;
  const updatedEmail = `updated-${marker}@example.test`;
  const addressLabel = 'Vestergade 2, 5000 Odense C';

  try {
    await page.route('**/api/addresses/search?**', (route) =>
      route.fulfill({
        json: [
          {
            id: municipality.addressId,
            titel: addressLabel,
            type: 'husnummer',
          },
        ],
      }),
    );

    await page.goto('/admin/kommuner/opret');
    await page.getByRole('textbox', { name: 'Kommunens navn' }).fill(name);
    await page.getByRole('combobox', { name: 'Region' }).click();
    await page.getByRole('option', { name: municipality.region }).click();
    await page
      .getByRole('textbox', { name: 'Telefonnummer' })
      .fill(municipality.phoneNumber);
    const email = page.getByRole('textbox', { name: 'E-mail' });
    await email.fill(initialEmail);
    await page.getByRole('combobox', { name: 'Adresse' }).fill('Vestergade 2');
    await page.getByRole('option', { name: addressLabel }).click();

    const createdResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        new URL(response.url()).pathname === '/api/municipalities',
    );
    await page.getByRole('button', { name: 'Gem kommune' }).click();
    const created = await createdResponse;
    expect(created.status()).toBe(201);
    const municipalityResponse: unknown = await created.json();
    if (
      typeof municipalityResponse !== 'object' ||
      municipalityResponse === null ||
      !('id' in municipalityResponse) ||
      typeof municipalityResponse.id !== 'number' ||
      !Number.isSafeInteger(municipalityResponse.id) ||
      municipalityResponse.id <= 0
    ) {
      throw new Error('Municipality creation did not return a valid ID.');
    }
    const { id } = municipalityResponse;
    await expect(page.getByRole('alert')).toHaveText('Kommunen er oprettet');

    await page.goto(`/sagsbehandler/kommuner/${id}`);
    await page
      .getByRole('navigation', { name: 'Sagsbehandling' })
      .getByRole('link', { name: 'Opdater kommuneoplysninger' })
      .click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await expect(email).toHaveValue(initialEmail);
    await email.fill(updatedEmail);
    await page.getByRole('button', { name: 'Gem ændringer' }).click();
    await expect(page.getByText('Kommuneoplysningerne er gemt.')).toBeVisible();

    await page.reload();
    await expect(email).toHaveValue(updatedEmail);
  } finally {
    const cleanupScript = fileURLToPath(
      new URL(
        '../../../../api/prisma/cleanup-playwright-municipality.ts',
        import.meta.url,
      ),
    );
    execFileSync('bun', ['run', cleanupScript, name], { stdio: 'inherit' });
  }
});
