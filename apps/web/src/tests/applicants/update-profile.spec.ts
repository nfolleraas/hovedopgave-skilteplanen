import { expect, test } from '@playwright/test';

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
  const email = page.getByRole('textbox', { name: 'E-mail' });
  await name.fill('Opdateret Profilnavn 😊');
  await email.fill('kontakt😊@example.dk');
  await save.click();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAttribute('aria-invalid', 'true');

  await name.fill('Opdateret Profilnavn');
  await email.fill('kontakt+test@example.dk');
  await save.click();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await email.fill('kontakt.test@example.dk');
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
