import { expect, type Page, test } from '@playwright/test';

/** Checks keyboard access, field validation and the list update after creation. */
async function verifyCreation({ page }: { page: Page }): Promise<void> {
  await page.route(
    '**/api/case-workers',
    /** Serves the initial list and verifies the client’s creation request. */
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: [
            {
              employeeNumber: 'DEMO001',
              name: 'Demo Superbruger',
              email: 'superbruger@example.test',
              phoneNumber: '12345678',
              isSuperUser: true,
              municipalityId: 1,
            },
          ],
        });
        return;
      }

      const input = route.request().postDataJSON();
      expect(input).toEqual({
        employeeNumber: '001ABC',
        name: 'Anne Müller',
        email: 'anne+test@example.dk',
        phoneNumber: '12345678',
        password: 'Test+🔑',
        isSuperUser: false,
      });
      await route.fulfill({
        status: 201,
        json: {
          employeeNumber: input.employeeNumber,
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber,
          isSuperUser: input.isSuperUser,
          municipalityId: 1,
        },
      });
    },
  );

  await page.goto('/sagsbehandler/kommuner/1/sagsbehandlere');
  await expect(page.getByRole('table')).toContainText('DEMO001');

  const create = page.getByRole('button', { name: 'Opret sagsbehandler' });
  await create.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Opret sagsbehandler' });
  const name = dialog.getByRole('textbox', { name: 'Navn' });
  await expect(name).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(create).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(name).toBeFocused();

  const employeeNumber = dialog.getByRole('textbox', {
    name: 'Medarbejdernummer',
  });
  await name.fill('Anne Müller');
  await employeeNumber.fill('SB-001');
  await dialog
    .getByRole('textbox', { name: 'E-mail' })
    .fill('anne+test@example.dk');
  await dialog.getByRole('textbox', { name: 'Telefonnummer' }).fill('12345678');
  await dialog.getByLabel('Adgangskode').fill('Test+🔑');
  await dialog.getByRole('button', { name: 'Opret', exact: true }).click();
  await expect(employeeNumber).toHaveAttribute('aria-invalid', 'true');
  await expect(employeeNumber).toBeFocused();
  await employeeNumber.fill('001ABC');
  await dialog.getByRole('button', { name: 'Opret', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status')).toHaveText(
    'Sagsbehandleren Anne Müller er oprettet.',
  );
  await expect(page.getByRole('row', { name: /001ABC/ })).toContainText(
    'anne+test@example.dk',
  );
}

test('creates a caseworker from the municipality list', verifyCreation);
