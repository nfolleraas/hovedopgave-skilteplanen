import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  documentsPagePath,
  installDocumentsApiMock,
} from './documents-page.fixtures.js';

type ElementBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

/**
 * Retrieves a visible element's box with a useful assertion on failure.
 * @param locator - The element whose rendered position is required
 * @returns The rendered element box
 */
async function elementBox(locator: Locator): Promise<ElementBox> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    throw new Error('Expected the element to have a rendered bounding box.');
  }

  return box;
}

/**
 * Verifies that two controls are laid out from left to right.
 * @param left - The expected left-hand control
 * @param right - The expected right-hand control
 */
async function expectHorizontalLayout(
  left: Locator,
  right: Locator,
): Promise<void> {
  const leftBox = await elementBox(left);
  const rightBox = await elementBox(right);

  expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(rightBox.x);
  expect(Math.abs(leftBox.y - rightBox.y)).toBeLessThan(4);
}

/**
 * Verifies that two differently sized regions occupy adjacent columns.
 * @param left - The expected left-hand region
 * @param right - The expected right-hand region
 */
async function expectSideBySide(left: Locator, right: Locator): Promise<void> {
  const leftBox = await elementBox(left);
  const rightBox = await elementBox(right);

  expect(leftBox.x + leftBox.width).toBeLessThanOrEqual(rightBox.x);
  expect(leftBox.y).toBeLessThan(rightBox.y + rightBox.height);
  expect(rightBox.y).toBeLessThan(leftBox.y + leftBox.height);
}

/**
 * Verifies that two controls are laid out from top to bottom.
 * @param top - The expected upper control
 * @param bottom - The expected lower control
 */
async function expectVerticalLayout(
  top: Locator,
  bottom: Locator,
): Promise<void> {
  const topBox = await elementBox(top);
  const bottomBox = await elementBox(bottom);

  expect(topBox.y + topBox.height).toBeLessThanOrEqual(bottomBox.y);
}

/**
 * Verifies that the page does not introduce horizontal document overflow.
 * @param page - The responsive page under test
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

/**
 * Returns the top-level document upload drop zone, including when hidden.
 * @param page - The documents page under test
 * @returns The responsive drop-zone section
 */
function documentDropZone(page: Page): Locator {
  return page.locator('section').filter({
    has: page.getByText('Drag and drop documents here, or choose files', {
      exact: true,
    }),
  });
}

/**
 * Returns the responsive card list, including when hidden.
 * @param page - The documents page under test
 * @returns The mobile and tablet document list
 */
function documentCardList(page: Page): Locator {
  return page.locator('ul[aria-labelledby]');
}

/**
 * Returns the page elements shared by the responsive layout assertions.
 * @param page - The documents page under test
 * @returns Locators for responsive content and navigation
 */
function responsiveElements(page: Page) {
  const navigation = page.getByRole('navigation', {
    name: 'Application document navigation',
  });

  return {
    addSignPlanButton: page.getByRole('button', { name: 'Add signplan' }),
    backLink: navigation.getByRole('link', { name: 'Back' }),
    cardList: documentCardList(page),
    dropZone: documentDropZone(page),
    nextLink: navigation.getByRole('link', { name: 'Next' }),
    table: page.locator('table'),
    uploadButton: page.getByRole('button', { name: 'Upload document' }),
  };
}

/**
 * Verifies that the documents page has finished loading.
 * @param page - The documents page under test
 */
async function expectDocumentsPageReady(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Documents and sign plans',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Uploaded documents' }),
  ).toHaveAttribute('aria-busy', 'false');
}

test.describe('documents page responsive layout', () => {
  test.use({ locale: 'en-GB', timezoneId: 'UTC' });

  test('uses the desktop layout', async ({ context, page }) => {
    // Arrange
    await page.setViewportSize({ height: 900, width: 1280 });
    await installDocumentsApiMock(context);
    const elements = responsiveElements(page);

    // Act
    await page.goto(documentsPagePath);

    // Assert
    await expectDocumentsPageReady(page);
    await expect(elements.dropZone).toBeVisible();
    await expect(elements.table).toBeVisible();
    await expect(elements.cardList).toBeHidden();
    await expectSideBySide(elements.addSignPlanButton, elements.dropZone);
    await expectHorizontalLayout(elements.backLink, elements.nextLink);
    await expectNoHorizontalOverflow(page);
  });

  test('uses the tablet layout', async ({ context, page }) => {
    // Arrange
    await page.setViewportSize({ height: 1024, width: 768 });
    await installDocumentsApiMock(context);
    const elements = responsiveElements(page);

    // Act
    await page.goto(documentsPagePath);

    // Assert
    await expectDocumentsPageReady(page);
    await expect(elements.dropZone).toBeHidden();
    await expect(elements.table).toBeHidden();
    await expect(elements.cardList).toBeVisible();
    await expectVerticalLayout(
      elements.addSignPlanButton,
      elements.uploadButton,
    );
    await expectHorizontalLayout(elements.backLink, elements.nextLink);
    await expectNoHorizontalOverflow(page);
  });

  test('uses the mobile layout', async ({ context, page }) => {
    // Arrange
    await page.setViewportSize({ height: 800, width: 390 });
    await installDocumentsApiMock(context);
    const elements = responsiveElements(page);

    // Act
    await page.goto(documentsPagePath);

    // Assert
    await expectDocumentsPageReady(page);
    await expect(elements.dropZone).toBeHidden();
    await expect(elements.table).toBeHidden();
    await expect(elements.cardList).toBeVisible();
    await expectVerticalLayout(
      elements.addSignPlanButton,
      elements.uploadButton,
    );
    await expectVerticalLayout(elements.backLink, elements.nextLink);
    await expectNoHorizontalOverflow(page);
  });

  test('opens the sign-plan dialog full screen on mobile', async ({
    context,
    page,
  }) => {
    // Arrange
    await page.setViewportSize({ height: 800, width: 390 });
    await installDocumentsApiMock(context);
    await page.goto(documentsPagePath);
    const addSignPlanButton = page.getByRole('button', {
      name: 'Add signplan',
    });
    await addSignPlanButton.waitFor({ state: 'visible' });

    // Act
    await addSignPlanButton.click();

    // Assert
    const mobileDialog = page.getByRole('dialog', { name: 'Add signplan' });
    await expect(mobileDialog).toHaveClass(/MuiDialog-paperFullScreen/);
    const dialogBox = await elementBox(mobileDialog);
    expect(dialogBox.x).toBe(0);
    expect(dialogBox.y).toBe(0);
    expect(dialogBox.width).toBe(390);
    expect(dialogBox.height).toBe(800);
  });
});
