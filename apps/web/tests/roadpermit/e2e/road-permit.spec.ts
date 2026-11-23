import { randomUUID } from 'node:crypto';
import { expect, type Page, test } from '@playwright/test';
import { mapAddress, mockMapServices } from './map-fixtures';

const overviewPath = '/ansoegning';
const draftsPath = '/api/road-permit/drafts';

async function startDraft(page: Page) {
  await page.goto(`${overviewPath}?lng=en`);
  await page
    .getByRole('button', {
      name: 'Apply for a road occupancy permit',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Municipality & title', exact: true }),
  ).toBeVisible();
  const caseNumber = new URL(page.url()).searchParams.get('draft');
  if (!caseNumber)
    throw new Error('The permit form opened without a case number.');
  return caseNumber;
}

async function chooseMunicipality(page: Page) {
  await page
    .getByRole('searchbox', { name: 'Search for a municipality' })
    .fill('oden');
  await expect(page.getByRole('radio')).toHaveCount(1);
  const odense = page.getByRole('radio', { name: 'Odense', exact: true });
  await odense.press('Space');
  await expect(odense).toBeChecked();
}

test('shows an overview link when a saved draft cannot be found', async ({
  page,
}) => {
  await page.goto(
    `${overviewPath}/opret-vejtilladelse?draft=${randomUUID()}&lng=en`,
  );
  await expect(page.getByRole('alert')).toHaveText(
    'The draft was not found. Go to the application overview to open another draft.',
  );
  await expect(
    page.getByRole('button', { name: 'Retry loading draft' }),
  ).toHaveCount(0);
  await page.getByRole('link', { name: 'Back to applications' }).click();
  await expect(page).toHaveURL(/\/ansoegning$/);
});

test('saves and reopens a draft after retrying failed requests on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const municipalityEndpoint = '**/api/municipalities';
  await page.route(municipalityEndpoint, (route) =>
    route.fulfill({ status: 503 }),
  );

  const caseNumber = await startDraft(page);
  const draftEndpoint = `/api/road-permit/${caseNumber}`;
  const draftURL = page.url();
  const title = `Draft ${randomUUID()}`;
  const titleInput = page.getByRole('textbox', { name: /^title/i });
  await titleInput.fill(title);
  await expect(
    page.getByText('The municipality list could not be loaded.'),
  ).toBeVisible();
  await page.unroute(municipalityEndpoint);
  await page
    .getByRole('button', { name: 'Retry loading municipalities' })
    .click();
  await chooseMunicipality(page);
  await expect(titleInput).toHaveValue(title);

  const stepNavigation = page.getByRole('navigation', {
    name: 'Application steps',
  });
  await expect(stepNavigation).toBeHidden();
  await page.getByRole('button', { name: 'Show steps' }).click();
  await expect(
    stepNavigation.getByRole('button', { name: 'Choose municipality & title' }),
  ).toHaveAttribute('aria-current', 'step');
  await stepNavigation
    .getByRole('button', { name: 'Materials', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Materials', exact: true }),
  ).toBeFocused();
  await expect(stepNavigation).toBeHidden();

  const overview = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Application' });
  await overview.click();
  const leaveDialog = page.getByRole('dialog', { name: 'Unsaved changes' });
  await leaveDialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(draftURL);

  await page.route(
    `**${draftEndpoint}`,
    (route) => route.fulfill({ status: 503 }),
    { times: 1 },
  );
  await overview.click();
  const saveAndLeave = leaveDialog.getByRole('button', {
    name: 'Save and leave',
  });
  await saveAndLeave.click();
  await expect(leaveDialog.getByRole('alert')).toHaveText(
    'The service is temporarily unavailable. Stay on this page and try again shortly.',
  );
  await expect(page).toHaveURL(draftURL);
  await saveAndLeave.click();

  await expect(page).toHaveURL(/\/ansoegning$/);
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(page).toHaveURL(draftURL);
  await page.reload();
  await expect(titleInput).toHaveValue(title);
  await expect(
    page.getByRole('radio', { name: 'Odense', exact: true }),
  ).toBeChecked();
});

test('validates, reviews and submits a road permit against its existing draft', async ({
  page,
  request,
}) => {
  await mockMapServices(page);
  const caseNumber = await startDraft(page);
  const draftEndpoint = `/api/road-permit/${caseNumber}`;
  const next = page.getByRole('button', { name: 'Next', exact: true });

  await next.click();
  const validation = page.getByRole('alert');
  await expect(validation.getByText('Enter a title.')).toBeVisible();
  await expect(
    validation.getByText('Select a municipality from the list.'),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: /^title/i })
    .fill('Road work on Parkvej');
  await chooseMunicipality(page);
  await next.click();

  await page.getByRole('combobox', { name: /type of use/i }).click();
  await page.getByRole('option', { name: 'Construction work' }).click();
  await page.getByLabel('Start date').fill('2030-11-16');
  await page.getByLabel('End date').fill('2030-11-15');
  await next.click();
  await expect(validation).toContainText(
    'The end date cannot be before the start date.',
  );
  await page.getByLabel('End date').fill('2030-11-18');
  const roadField = page.getByRole('combobox', { name: /^road\b/i });
  await roadField.fill('Parkvej');
  await expect(
    page.getByRole('option', { name: 'Parkvej, 2750 Ballerup' }),
  ).toBeVisible();
  await page.getByRole('option', { name: 'Parkvej, 5260 Odense S' }).click();
  await expect(page.getByLabel('Postal code')).toHaveValue('5260');
  await expect(page.getByLabel('City', { exact: false })).toHaveValue(
    'Odense S',
  );
  await page.getByLabel('House number from').fill('12');
  await page.getByLabel('House number to').fill('20');
  await next.click();

  await page.getByRole('combobox', { name: /material type/i }).click();
  await page.getByRole('option', { name: 'Container' }).click();
  await page.getByRole('spinbutton', { name: 'Quantity' }).fill('2');
  await next.click();
  await expect(validation).toContainText(
    'Add the material, save your changes, or cancel the draft.',
  );
  await page.getByRole('button', { name: 'Add material' }).click();
  await expect(
    page
      .getByRole('table', { name: 'Materials list' })
      .getByRole('row', { name: /Container 2/ }),
  ).toBeVisible();
  await next.click();

  await page.getByLabel(/^name\b/i).fill('Test Contact');
  await page.getByLabel('Phone number').fill('12345678');
  await page.getByLabel(/^email\b/i).fill('test@example.com');
  await next.click();

  await page.getByRole('combobox', { name: 'Traffic changes' }).click();
  await page.getByRole('option', { name: 'Stopping and parking' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('checkbox', { name: 'Type B', exact: true }).check();
  await next.click();
  await expect(
    page.getByRole('heading', { name: 'Attachments for the application' }),
  ).toBeVisible();
  await next.click();

  await expect(
    page.getByRole('heading', { name: 'Review & submission' }),
  ).toBeVisible();
  await expect(page.getByText('Nov 16, 2030')).toBeVisible();
  await expect(page.getByText('Road work on Parkvej')).toBeVisible();
  await expect(page.getByText('Test Contact')).toBeVisible();
  await expect(page.getByText('Stopping and parking')).toBeVisible();
  await expect(
    page
      .getByRole('table', { name: 'Selected traffic measures' })
      .getByText('Road closure'),
  ).toBeVisible();
  const submit = page.getByRole('button', { name: 'Submit application' });
  await expect(submit).toBeDisabled();
  await page.getByRole('checkbox', { name: /^I declare/ }).check();

  const submitEndpoint = `${draftEndpoint}/submit`;
  await page.route(
    `**${submitEndpoint}`,
    (route) => route.fulfill({ status: 503 }),
    { times: 1 },
  );
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText(
    'The service is temporarily unavailable. Stay on this page and try again shortly.',
  );
  expect((await request.get(draftEndpoint)).ok()).toBe(true);

  const submitted = page.waitForResponse(
    (response) =>
      response.url().endsWith(submitEndpoint) &&
      response.request().method() === 'POST',
  );
  await submit.click();
  const response = await submitted;
  expect(response.status()).toBe(201);
  expect(await response.json()).toEqual({ caseNumber, status: 'InProgress' });
  await expect(
    page.getByRole('dialog', { name: 'Your application has been submitted.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/ansoegning$/);
  expect(await (await request.get(draftsPath)).json()).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ caseNumber })]),
  );
  expect((await request.get(draftEndpoint)).status()).toBe(404);
});

test('recovers the map layer list after a failed request', async ({ page }) => {
  await mockMapServices(page);
  const catalog = /[?&]REQUEST=GetCapabilities/;
  const cors = { 'access-control-allow-origin': '*' };
  await page.route(catalog, (route) =>
    route.fulfill({
      headers: cors,
      contentType: 'text/xml',
      body: `<WMS_Capabilities version="1.3.0">
      <Capability><Layer><CRS>EPSG:3857</CRS><Layer>
        <Name>MatrikelGeometri</Name><Title>Matrikel geometri</Title>
      </Layer></Layer></Capability>
    </WMS_Capabilities>`,
    }),
  );
  await page.route(
    catalog,
    (route) => route.fulfill({ status: 503, headers: cors }),
    { times: 1 },
  );

  await startDraft(page);
  await page
    .getByRole('navigation', { name: 'Application steps' })
    .getByRole('button', { name: 'Usage details' })
    .click();
  await page.getByRole('button', { name: 'Map layers' }).click();
  const layers = page.getByRole('dialog', { name: 'Map layers' });
  await expect(layers.getByRole('alert')).toContainText(
    'The map layer list could not be loaded.',
  );
  const parcels = layers.getByRole('switch', { name: 'Cadastral parcels' });
  await expect(parcels).toBeDisabled();
  await layers
    .getByRole('button', { name: 'Retry loading map layers' })
    .click();
  await expect(parcels).toBeEnabled();
  await expect(layers.getByRole('alert')).toBeHidden();
});

test('locates an address and transfers a drawn road stretch to the form', async ({
  page,
}) => {
  await mockMapServices(page);
  await startDraft(page);
  await page
    .getByRole('navigation', { name: 'Application steps' })
    .getByRole('button', { name: 'Usage details' })
    .click();
  await page.getByRole('button', { name: 'Search the map' }).click();
  await page
    .getByRole('combobox', { name: 'Address', exact: true })
    .fill('Parkvej 12');
  await page.getByRole('option', { name: mapAddress }).click();
  await expect(page.getByText(`Map centered on ${mapAddress}.`)).toBeAttached();

  const map = page.getByRole('region', { name: 'Map of the area of use' });
  await page
    .getByRole('button', { name: 'Draw road stretch', exact: true })
    .click();
  const area = await map.boundingBox();
  if (!area) throw new Error('Map is not visible.');
  await map.click({ position: { x: area.width / 2 - 60, y: area.height / 2 } });
  await expect(
    page.getByText('Choose the end point on the road.'),
  ).toBeVisible();
  await map.click({ position: { x: area.width / 2 + 60, y: area.height / 2 } });

  const confirm = page.getByRole('dialog', {
    name: 'Confirm road and house numbers',
  });
  await expect(confirm.getByLabel(/^road\b/i)).toHaveValue('Parkvej');
  await expect(confirm.getByLabel('House number from')).toHaveValue('12');
  await expect(confirm.getByLabel('House number to')).toHaveValue('20');
  await confirm.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByRole('combobox', { name: /^road\b/i })).toHaveValue(
    'Parkvej',
  );
  await expect(page.getByLabel('House number from')).toHaveValue('12');
  await expect(page.getByLabel('House number to')).toHaveValue('20');
  await expect(page.getByLabel('Postal code')).toHaveValue('5260');
  await expect(page.getByLabel('City', { exact: false })).toHaveValue(
    'Odense S',
  );
});
