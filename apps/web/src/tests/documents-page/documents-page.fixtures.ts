import { type BrowserContext, expect, type Page } from '@playwright/test';
import type { Document as ApplicationDocument } from '../../pages/documents-page/document.types.js';

export const documentsPagePath = '/ansoegning/dokumenter?lng=en';
export const demoApplicationId = 'DEMO-2026-0001';

export const overviewDocuments: ApplicationDocument[] = [
  {
    applicationId: demoApplicationId,
    date: '2026-01-02T10:15:00.000Z',
    documentType: 'Other',
    name: 'road-closure-permit.pdf',
    url: '/previews/road-closure-permit.pdf',
    uuid: 'document-road-closure-permit',
  },
  {
    applicationId: demoApplicationId,
    date: '2026-02-14T14:30:00.000Z',
    documentType: 'SignPlan',
    name: 'junction-sign-plan.png',
    url: '/previews/junction-sign-plan.png',
    uuid: 'document-junction-sign-plan',
  },
];

type UploadRequest = {
  applicationId: string;
  documentType: string;
  endpoint: '/api/documents' | '/api/sign-plans';
  fileName: string;
};

export type DocumentsApiState = {
  deletedDocumentIds: string[];
  documentListRequestCount: number;
  retrievedDocumentIds: string[];
  uploads: UploadRequest[];
};

type FilePayload = {
  buffer: Buffer;
  mimeType: string;
  name: string;
};

const unsupportedFileTypeMessage = 'Only PDF, JPG, and PNG files are allowed.';

/**
 * Creates an in-memory file suitable for a Playwright file input.
 * @param name - The file name exposed to the browser
 * @param mimeType - The MIME type exposed to the browser
 * @returns A small deterministic file payload
 */
export function createFilePayload(name: string, mimeType: string): FilePayload {
  return {
    buffer: Buffer.from(`Playwright fixture for ${name}`),
    mimeType,
    name,
  };
}

/**
 * Reads a text field from a multipart request body.
 * @param body - The serialized multipart request body
 * @param fieldName - The form field to retrieve
 * @returns The submitted value, or an empty string when absent
 */
function readMultipartField(body: string, fieldName: string): string {
  const fieldPattern = new RegExp(
    `name="${fieldName}"\\r\\n\\r\\n([^\\r\\n]*)`,
  );

  return fieldPattern.exec(body)?.[1] ?? '';
}

/**
 * Reads the uploaded file name from a multipart request body.
 * @param body - The serialized multipart request body
 * @returns The submitted file name
 */
function readMultipartFileName(body: string): string {
  return /filename="([^"]+)"/.exec(body)?.[1] ?? 'unknown-file.pdf';
}

/**
 * Determines whether a file name uses an accepted upload extension.
 * @param fileName - The submitted file name
 * @returns Whether the mocked API accepts the file
 */
function isSupportedFile(fileName: string): boolean {
  return /\.(?:jpe?g|pdf|png)$/i.test(fileName);
}

/**
 * Creates the API representation of an uploaded document.
 * @param fileName - The submitted file name
 * @param documentType - The category assigned to the document
 * @param sequence - A unique sequence for this mock request
 * @returns A deterministic uploaded document
 */
function createUploadedDocument(
  fileName: string,
  documentType: ApplicationDocument['documentType'],
  sequence: number,
): ApplicationDocument {
  const safeName = fileName.replace(/[^a-z0-9.-]+/gi, '-').toLowerCase();

  return {
    applicationId: demoApplicationId,
    date: `2026-03-${String(sequence).padStart(2, '0')}T12:00:00.000Z`,
    documentType,
    name: fileName,
    url: `/previews/${encodeURIComponent(fileName)}`,
    uuid: `uploaded-${sequence}-${safeName}`,
  };
}

/**
 * Installs deterministic API and preview routes for the documents page.
 * Repeated overview requests intentionally receive the same snapshot so the
 * fixture also supports React StrictMode's development-only effect replay.
 * @param context - The isolated browser context used by the test
 * @param initialDocuments - The documents returned by the overview endpoint
 * @returns Mutable request state for integration assertions
 */
export async function installDocumentsApiMock(
  context: BrowserContext,
  initialDocuments: ApplicationDocument[] = overviewDocuments,
): Promise<DocumentsApiState> {
  const state: DocumentsApiState = {
    deletedDocumentIds: [],
    documentListRequestCount: 0,
    retrievedDocumentIds: [],
    uploads: [],
  };
  const documentsById = new Map(
    initialDocuments.map((document) => [document.uuid, document]),
  );
  let uploadSequence = 0;

  await context.route('**/previews/**', async (route) => {
    await route.fulfill({
      body: '<!doctype html><title>Preview fixture</title><p>Preview fixture</p>',
      contentType: 'text/html',
      status: 200,
    });
  });

  await context.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request();
      const method = request.method();
      const pathname = new URL(request.url()).pathname;

      if (method === 'GET' && pathname === '/api/documents') {
        state.documentListRequestCount += 1;
        await route.fulfill({ json: initialDocuments, status: 200 });
        return;
      }

      const documentPathMatch = /^\/api\/documents\/([^/]+)$/.exec(pathname);

      if (method === 'GET' && documentPathMatch) {
        const documentId = decodeURIComponent(documentPathMatch[1]);
        const document = documentsById.get(documentId);
        state.retrievedDocumentIds.push(documentId);

        await route.fulfill(
          document
            ? { json: document, status: 200 }
            : { json: { message: 'Document not found.' }, status: 404 },
        );
        return;
      }

      if (method === 'DELETE' && documentPathMatch) {
        const documentId = decodeURIComponent(documentPathMatch[1]);
        state.deletedDocumentIds.push(documentId);
        documentsById.delete(documentId);
        await route.fulfill({ status: 204 });
        return;
      }

      if (
        method === 'POST' &&
        (pathname === '/api/documents' || pathname === '/api/sign-plans')
      ) {
        const body = request.postData() ?? '';
        const fileName = readMultipartFileName(body);
        const documentType =
          pathname === '/api/sign-plans'
            ? 'SignPlan'
            : readMultipartField(body, 'documentType');

        state.uploads.push({
          applicationId: readMultipartField(body, 'applicationId'),
          documentType,
          endpoint: pathname,
          fileName,
        });

        if (!isSupportedFile(fileName)) {
          await route.fulfill({
            json: { message: unsupportedFileTypeMessage },
            status: 400,
          });
          return;
        }

        uploadSequence += 1;
        const uploadedDocument = createUploadedDocument(
          fileName,
          documentType === 'SignPlan' ? 'SignPlan' : 'Other',
          uploadSequence,
        );
        documentsById.set(uploadedDocument.uuid, uploadedDocument);

        if (pathname === '/api/sign-plans') {
          await route.fulfill({
            json: { documentId: uploadedDocument.uuid },
            status: 201,
          });
          return;
        }

        await route.fulfill({ json: uploadedDocument, status: 201 });
        return;
      }

      await route.fulfill({
        json: {
          message: `Unexpected mocked API request: ${method} ${pathname}`,
        },
        status: 404,
      });
    },
  );

  return state;
}

/**
 * Opens the English documents page and waits for its overview request.
 * @param page - The Playwright page under test
 */
export async function openDocumentsPage(page: Page): Promise<void> {
  await page.goto(documentsPagePath);
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
