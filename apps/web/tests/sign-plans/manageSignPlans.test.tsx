import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const applicationId = 'application-123';
const uploadDocument = vi.mocked(createDocument);
const uploadSignPlan = vi.mocked(createSignPlan);

/**
 * Creates the document state consumed by the shared documents page.
 * @returns A complete empty document state for the page
 */
function createDocumentsState(): DocumentsState {
  return {
    addDocuments: vi.fn(),
    documents: [],
    error: null,
    isLoading: false,
    loadStatusMessage: '',
    removeDocument: vi.fn(),
  };
}

/**
 * Renders the shared page and opens its sign-plan dialog.
 * @param documentsState - The state supplied to the documents page
 * @returns The opened dialog and its configured user-event instance
 */
async function renderSignPlanDialog(documentsState: DocumentsState) {
  const user = userEvent.setup();
  await renderWithTranslations(
    <DocumentsPage
      applicationId={applicationId}
      documentsState={documentsState}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Add signplan' }));

  return {
    dialog: screen.getByRole('dialog', { name: 'Add signplan' }),
    user,
  };
}

describe('Sign-plan management', () => {
  beforeEach(() => {
    uploadDocument.mockReset();
    uploadSignPlan.mockReset();
  });

  it('keeps the sign-plan choices in their own dialog', async () => {
    const { dialog, user } = await renderSignPlanDialog(createDocumentsState());
    const signPlanDialog = within(dialog);

    expect(
      signPlanDialog.getByRole('heading', {
        name: 'Upload an existing sign plan',
      }),
    ).toBeTruthy();
    expect(
      signPlanDialog.getByRole('heading', {
        name: 'Create a new sign plan',
      }),
    ).toBeTruthy();
    expect(signPlanDialog.getByText('Create sign plan')).toBeTruthy();

    await user.click(
      signPlanDialog.getByRole('button', { name: 'Close add signplan' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Add signplan' })).toBeNull(),
    );
  });

  it('uploads an existing sign plan through the sign-plans API', async () => {
    const uploadedSignPlan: Document = {
      applicationId,
      date: '2026-11-22T12:00:00.000Z',
      documentType: 'SignPlan',
      name: 'sign-plan.pdf',
      url: '/previews/sign-plan.pdf',
      uuid: 'uploaded-sign-plan',
    };
    const documentsState = createDocumentsState();
    uploadSignPlan.mockResolvedValue(uploadedSignPlan);
    const { dialog, user } = await renderSignPlanDialog(documentsState);
    const file = new File(['plan'], uploadedSignPlan.name, {
      type: 'application/pdf',
    });
    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) throw new Error('Sign-plan input was not rendered.');
    await user.upload(input, file);

    expect(
      await within(dialog).findByText('Upload complete. 1 file was uploaded.'),
    ).toBeTruthy();
    expect(uploadSignPlan).toHaveBeenCalledExactlyOnceWith(file, applicationId);
    expect(uploadDocument).not.toHaveBeenCalled();
    expect(documentsState.addDocuments).toHaveBeenCalledExactlyOnceWith([
      uploadedSignPlan,
    ]);
  });
});
