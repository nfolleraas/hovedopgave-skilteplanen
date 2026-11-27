import { expect, type Page } from '@playwright/test';
import type { SavedActor } from '../../src/pages/actors-page/actor.types.js';

export const actor: SavedActor = {
  uuid: '11111111-1111-4111-8111-111111111111',
  name: 'Anna Jensen',
  role: 'Private',
  phoneNumber: '12345678',
  email: 'anna@example.com',
  cvrNumber: null,
  department: null,
  address: {
    uuid: '22222222-2222-4222-8222-222222222222',
    street: 'Vestergade',
    houseNumber: '10',
    postalCode: '5000',
    city: 'Odense C',
  },
  contactPersons: [],
};

/** Opens the actor step of the current application on desktop or mobile. */
export async function openActorStep(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Kommune & titel', exact: true }),
  ).toBeVisible();
  const steps = page.getByRole('navigation', { name: 'Ansøgningens trin' });
  if (!(await steps.isVisible())) {
    await page.getByRole('button', { name: 'Vis trin', exact: true }).click();
  }
  await steps.getByRole('button', { name: 'Aktør', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Aktør', exact: true }),
  ).toBeVisible();
}

/** Starts a real application draft before opening its embedded actor step. */
export async function startApplication(page: Page): Promise<string> {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Hovednavigation' })
    .getByRole('link', { name: 'Ansøgning', exact: true })
    .click();
  await expect(page).toHaveURL('/ansoegning');
  await page
    .getByRole('button', {
      name: 'Opret tilladelse til råden over vej',
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/ansoegning\/opret-vejtilladelse\?draft=.+/);
  const caseNumber = new URL(page.url()).searchParams.get('draft');
  if (!caseNumber) throw new Error('Application draft has no case number.');
  await openActorStep(page);
  return caseNumber;
}
