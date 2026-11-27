import { expect, test } from '@playwright/test';

test('dashboard renders Danish translations and keyboard skip link', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Ansøgningsplatformen', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'da');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Spring til hovedindhold' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('English preference survives a reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload();
  await expect(
    page.getByText('The login form will appear here.'),
  ).toBeVisible();
});

test('unsupported detected languages fall back to English', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ locale: 'fr-FR', baseURL });
  try {
    const page = await context.newPage();
    // The detector also reads the HTML language after browser preferences.
    await page.route('**/login', async (route) => {
      const response = await route.fetch();
      const html = await response.text();
      await route.fulfill({
        response,
        body: html.replace('lang="da"', 'lang="fr"'),
      });
    });
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Log in', exact: true }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  } finally {
    await context.close();
  }
});

test('unknown route displays translated not-found page', async ({ page }) => {
  await page.goto('/missing-page');
  await expect(
    page.getByRole('heading', { name: 'Siden blev ikke fundet' }),
  ).toBeVisible();
  const dashboard = page.getByRole('link', { name: 'Dashboard', exact: true });
  await dashboard.click();
  await expect(page).toHaveURL('/');
  await expect(dashboard).toHaveAttribute('aria-current', 'page');
});

for (const path of ['/kontaktpersoner', '/beskeder']) {
  test(`${path} supports direct navigation and reload`, async ({ page }) => {
    await page.goto(path);
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
  });
}
