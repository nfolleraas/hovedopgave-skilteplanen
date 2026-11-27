import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../src/api/client.api';
import { createDocument } from '../../src/api/documents.api';
import { createSignPlan } from '../../src/api/sign-plans.api';
import DocumentsPage from '../../src/pages/documents-page';
import type { Document } from '../../src/pages/documents-page/document.types';
import type { DocumentsState } from '../../src/pages/documents-page/hooks/use-documents';
import { renderWithTranslations } from '../renderWithTranslations';

vi.mock('../../src/api/documents.api', () => ({
  createDocument: vi.fn(),
}));

vi.mock('../../src/api/sign-plans.api', () => ({
  createSignPlan: vi.fn(),
}));

vi.mock('../../src/api/client.api', () => ({
  apiClient: { delete: vi.fn() },
}));

const applicationId = 'application-123';
const uploadDocument = vi.mocked(createDocument);
const uploadSignPlan = vi.mocked(createSignPlan);
const deleteResource = vi.mocked(apiClient.delete);

/**
 * Creates the document state consumed by the shared documents page.
 * @param overrides - State values to replace in the default document state
 * @returns A complete document state for the page
 */
function createDocumentsState(
  overrides: Partial<DocumentsState> = {},
): DocumentsState {
  return {
    addDocuments: vi.fn(),
    documents: [],
    error: null,
    isLoading: false,
    loadStatusMessage: '',
    removeDocument: vi.fn(),
    ...overrides,
  };
}

/**
 * Renders the documents page with an isolated document state.
 * @param documentsState - The state supplied to the documents page
 * @returns The rendered Testing Library view
 */
async function renderDocumentsPage(documentsState: DocumentsState) {
  return renderWithTranslations(
    <DocumentsPage
      applicationId={applicationId}
      documentsState={documentsState}
    />,
  );
}

describe('Document management', () => {
  beforeEach(() => {
    uploadDocument.mockReset();
    uploadSignPlan.mockReset();
    deleteResource.mockReset().mockResolvedValue(undefined);
  });

  it('uploads an ordinary document through the documents API', async () => {
    const user = userEvent.setup();
    const uploadedDocument: Document = {
      applicationId,
      date: '2026-11-21T12:00:00.000Z',
      documentType: 'Other',
      name: 'work-zone-photo.jpg',
      url: '/previews/work-zone-photo.jpg',
      uuid: 'uploaded-document',
    };
    const documentsState = createDocumentsState();
    uploadDocument.mockResolvedValue(uploadedDocument);
    const { container } = await renderDocumentsPage(documentsState);
    const file = new File(['permit'], uploadedDocument.name, {
      type: 'image/jpeg',
    });
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) throw new Error('Document input was not rendered.');
    await user.upload(input, file);

    expect(
      await screen.findByText('Upload complete. 1 file was uploaded.'),
    ).toBeTruthy();
    expect(uploadDocument).toHaveBeenCalledExactlyOnceWith(
      file,
      applicationId,
      'Other',
    );
    expect(uploadSignPlan).not.toHaveBeenCalled();
    expect(documentsState.addDocuments).toHaveBeenCalledExactlyOnceWith([
      uploadedDocument,
    ]);
  });

  it('previews and deletes an uploaded document', async () => {
    const user = userEvent.setup();
    const existingDocument: Document = {
      applicationId,
      date: '2026-11-20T10:00:00.000Z',
      documentType: 'Other',
      name: 'existing-permit.pdf',
      url: '/previews/existing-permit.pdf',
      uuid: 'existing-document',
    };
    const documentsState = createDocumentsState({
      documents: [existingDocument],
    });
    await renderDocumentsPage(documentsState);

    await user.click(
      screen.getByRole('button', {
        name: `Preview ${existingDocument.name}`,
      }),
    );
    const previewDialog = within(
      screen.getByRole('dialog', {
        name: new RegExp(`^Preview of ${existingDocument.name}`),
      }),
    );
    expect(
      previewDialog
        .getByTitle(`Preview of ${existingDocument.name}`)
        .getAttribute('src'),
    ).toBe(existingDocument.url);
    await user.click(
      previewDialog.getByRole('button', { name: 'Close preview' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', {
          name: new RegExp(`^Preview of ${existingDocument.name}`),
        }),
      ).toBeNull(),
    );

    await user.click(
      screen.getByRole('button', {
        name: `Delete ${existingDocument.name}`,
      }),
    );
    const deleteDialog = within(
      screen.getByRole('dialog', { name: 'Confirm deletion' }),
    );
    await user.click(deleteDialog.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(deleteResource).toHaveBeenCalledExactlyOnceWith(
        `/documents/${existingDocument.uuid}`,
      ),
    );
    expect(documentsState.removeDocument).toHaveBeenCalledExactlyOnceWith(
      existingDocument.uuid,
    );
  });
});
