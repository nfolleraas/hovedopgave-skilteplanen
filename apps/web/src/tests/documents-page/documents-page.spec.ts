import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  createFilePayload,
  demoApplicationId,
  installDocumentsApiMock,
  openDocumentsPage,
  overviewDocuments,
} from './documents-page.fixtures.js';

const uploadSuccess = {
  one: 'Upload complete. 1 file was uploaded.',
  two: 'Upload complete. 2 files were uploaded.',
};
const unsupportedFileFailure = {
  one: 'Failed to upload 1 file: Unsupported file type. Only PDF, JPG, and PNG files are allowed.',
  two: 'Failed to upload 2 files: Unsupported file type. Only PDF, JPG, and PNG files are allowed.',
};

/**
 * Returns the main document file input, excluding any sign-plan dialog input.
 * @param page - The documents page under test
 * @returns The hidden file input used for ordinary documents
 */
function documentFileInput(page: Page): Locator {
  return page.locator('main input[type="file"]');
}

/**
 * Returns an alert by its complete user-facing message.
 * @param page - The documents page under test
 * @param message - The alert text to match
 * @returns The matching alert locator
 */
function alertWithMessage(page: Page, message: string): Locator {
  return page.getByRole('alert').filter({ hasText: message });
}

/**
 * Returns a status message by its complete user-facing text.
 * @param page - The documents page under test
 * @param message - The status text to match
 * @returns The matching status locator
 */
function statusWithMessage(page: Page, message: string): Locator {
  return page.getByRole('status').filter({ hasText: message });
}

/**
 * Opens the confirmation dialog for a named document.
 * @param page - The documents page under test
 * @param documentName - The document whose delete action is selected
 * @returns The open confirmation dialog
 */
async function openDeleteDialog(
  page: Page,
  documentName: string,
): Promise<Locator> {
  await page.getByRole('button', { name: `Delete ${documentName}` }).click();

  const dialog = page.getByRole('dialog', { name: 'Confirm deletion' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    `Are you sure you want to delete "${documentName}"? This action cannot be undone.`,
  );

  return dialog;
}

test.describe('documents page', () => {
  test.use({
    locale: 'en-GB',
    timezoneId: 'UTC',
    viewport: { height: 900, width: 1280 },
  });

  test('loads the document overview with complete document information', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context);

    await openDocumentsPage(page);

    await expect(page).toHaveTitle('Documents and sign plans – Skilteplanen');
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
    await expect(
      page.getByText(
        'Upload and manage the documents and sign plans required for your application.',
      ),
    ).toBeVisible();
    await expect(
      statusWithMessage(page, 'The document list loaded with 2 documents.'),
    ).toHaveCount(1);

    const table = page.getByRole('table', { name: 'Uploaded documents' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader')).toHaveText([
      'Name',
      'Document type',
      'Created',
      'Actions',
    ]);

    const signPlanRow = table.getByRole('row', {
      name: /junction-sign-plan\.png/,
    });
    await expect(signPlanRow).toContainText('Sign plan');
    await expect(signPlanRow).toContainText('14 February 2026');
    await expect(signPlanRow.locator('time')).toHaveAttribute(
      'datetime',
      overviewDocuments[1].date,
    );
    await expect(
      signPlanRow.getByRole('button', {
        name: 'Preview junction-sign-plan.png',
      }),
    ).toBeVisible();

    const documentRow = table.getByRole('row', {
      name: /road-closure-permit\.pdf/,
    });
    await expect(documentRow).toContainText('Other');
    await expect(documentRow).toContainText('2 January 2026');
    await expect(documentRow.locator('time')).toHaveAttribute(
      'datetime',
      overviewDocuments[0].date,
    );
    await expect(
      documentRow.getByRole('button', {
        name: 'Delete road-closure-permit.pdf',
      }),
    ).toBeVisible();

    const navigation = page.getByRole('navigation', {
      name: 'Application document navigation',
    });
    await expect(
      navigation.getByRole('link', { name: 'Back' }),
    ).toHaveAttribute('href', '/ansoegning');
    await expect(
      navigation.getByRole('link', { name: 'Next' }),
    ).toHaveAttribute('href', '/kontaktpersoner');
    expect(api.documentListRequestCount).toBeGreaterThanOrEqual(1);
  });

  test('uploads a valid document and adds it to the overview', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context, []);
    await openDocumentsPage(page);

    await documentFileInput(page).setInputFiles(
      createFilePayload('work-zone-photo.jpg', 'image/jpeg'),
    );

    await expect(statusWithMessage(page, uploadSuccess.one)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Preview work-zone-photo.jpg' }),
    ).toBeVisible();
    expect(api.uploads).toEqual([
      {
        applicationId: demoApplicationId,
        documentType: 'Other',
        endpoint: '/api/documents',
        fileName: 'work-zone-photo.jpg',
      },
    ]);
  });

  test('rejects an invalid document and leaves the overview unchanged', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context, []);
    await openDocumentsPage(page);

    await documentFileInput(page).setInputFiles(
      createFilePayload('notes.txt', 'text/plain'),
    );

    await expect(
      alertWithMessage(page, unsupportedFileFailure.one),
    ).toBeVisible();
    await expect(
      page.getByText('No documents have been uploaded yet.'),
    ).toBeVisible();
    await expect(statusWithMessage(page, uploadSuccess.one)).toHaveCount(0);
    expect(api.uploads).toHaveLength(1);
  });

  test('reports the correct count after uploading multiple valid documents', async ({
    context,
    page,
  }) => {
    await installDocumentsApiMock(context, []);
    await openDocumentsPage(page);

    await documentFileInput(page).setInputFiles([
      createFilePayload('permit.pdf', 'application/pdf'),
      createFilePayload('site-photo.png', 'image/png'),
    ]);

    await expect(statusWithMessage(page, uploadSuccess.two)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Preview permit.pdf' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Preview site-photo.png' }),
    ).toBeVisible();
  });

  test('reports the correct count after rejecting multiple invalid documents', async ({
    context,
    page,
  }) => {
    await installDocumentsApiMock(context, []);
    await openDocumentsPage(page);

    await documentFileInput(page).setInputFiles([
      createFilePayload('notes.txt', 'text/plain'),
      createFilePayload('budget.xlsx', 'application/vnd.ms-excel'),
    ]);

    await expect(
      alertWithMessage(page, unsupportedFileFailure.two),
    ).toBeVisible();
    await expect(
      page.getByText('No documents have been uploaded yet.'),
    ).toBeVisible();
    await expect(statusWithMessage(page, uploadSuccess.two)).toHaveCount(0);
  });

  test('shows both success and failure feedback for a mixed upload', async ({
    context,
    page,
  }) => {
    await installDocumentsApiMock(context, []);
    await openDocumentsPage(page);

    await documentFileInput(page).setInputFiles([
      createFilePayload('approved-plan.pdf', 'application/pdf'),
      createFilePayload('readme.md', 'text/markdown'),
    ]);

    await expect(statusWithMessage(page, uploadSuccess.one)).toBeVisible();
    await expect(
      alertWithMessage(page, unsupportedFileFailure.one),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Preview approved-plan.pdf' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Preview readme.md' }),
    ).toHaveCount(0);
  });

  test('uploads an existing sign plan through the sign-plan flow', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context, []);
    await openDocumentsPage(page);

    await page.getByRole('button', { name: 'Add signplan' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add signplan' });
    await expect(dialog).toBeVisible();
    await dialog
      .locator('input[type="file"]')
      .setInputFiles(
        createFilePayload('uploaded-sign-plan.pdf', 'application/pdf'),
      );

    await expect(
      dialog.getByRole('status').filter({ hasText: uploadSuccess.one }),
    ).toBeVisible();
    expect(api.uploads).toEqual([
      {
        applicationId: demoApplicationId,
        documentType: 'SignPlan',
        endpoint: '/api/sign-plans',
        fileName: 'uploaded-sign-plan.pdf',
      },
    ]);
    expect(api.retrievedDocumentIds).toHaveLength(1);

    await dialog.getByRole('button', { name: 'Close add signplan' }).click();
    const signPlanRow = page
      .getByRole('table', { name: 'Uploaded documents' })
      .getByRole('row', { name: /uploaded-sign-plan\.pdf/ });
    await expect(signPlanRow).toContainText('Sign plan');
  });

  test('opens a file preview and opens the same file in a new tab', async ({
    context,
    page,
  }) => {
    await installDocumentsApiMock(context);
    await openDocumentsPage(page);

    await page
      .getByRole('button', { name: 'Preview road-closure-permit.pdf' })
      .click();

    const dialog = page.getByRole('dialog', {
      name: 'Preview of road-closure-permit.pdf',
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('iframe[title="Preview of road-closure-permit.pdf"]'),
    ).toHaveAttribute('src', '/previews/road-closure-permit.pdf');

    const popupPromise = page.waitForEvent('popup');
    await dialog.getByRole('link', { name: 'Open in a new tab' }).click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/\/previews\/road-closure-permit\.pdf$/);
    await expect(popup.locator('body')).toContainText('Preview fixture');
    await popup.close();
  });

  test('cancels document deletion without deleting the document', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context);
    await openDocumentsPage(page);

    const dialog = await openDeleteDialog(page, 'road-closure-permit.pdf');
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole('button', {
        name: 'Preview road-closure-permit.pdf',
      }),
    ).toBeVisible();
    expect(api.deletedDocumentIds).toEqual([]);
  });

  test('confirms document deletion and removes the document from the list', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context);
    await openDocumentsPage(page);

    const dialog = await openDeleteDialog(page, 'road-closure-permit.pdf');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(
      statusWithMessage(page, 'road-closure-permit.pdf was deleted.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Preview road-closure-permit.pdf',
      }),
    ).toHaveCount(0);
    expect(api.deletedDocumentIds).toEqual(['document-road-closure-permit']);
  });

  test('confirms sign-plan deletion and removes the sign plan from the list', async ({
    context,
    page,
  }) => {
    const api = await installDocumentsApiMock(context);
    await openDocumentsPage(page);

    const dialog = await openDeleteDialog(page, 'junction-sign-plan.png');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(
      statusWithMessage(page, 'junction-sign-plan.png was deleted.'),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Preview junction-sign-plan.png',
      }),
    ).toHaveCount(0);
    expect(api.deletedDocumentIds).toEqual(['document-junction-sign-plan']);
  });
});
