import axios from 'axios';
import type {
  Document,
  DocumentType,
} from '../pages/documents-page/document.types.js';
import { createDocument } from './documents.api.js';
import { createSignPlan } from './sign-plans.api.js';

type ApiErrorResponse = {
  message?: string;
};

export type DocumentUploadFailureReason = 'unexpected' | 'unsupportedFileType';

export type DocumentUploadResult =
  | { document: Document; status: 'fulfilled' }
  | { reason: DocumentUploadFailureReason; status: 'rejected' };

const unsupportedFileTypeMessage = 'Only PDF, JPG, and PNG files are allowed.';

/**
 * Classifies an API error as a user-facing document upload failure reason.
 * @param error - The rejected upload error
 * @returns The normalized document upload failure reason
 */
function getDocumentUploadFailureReason(
  error: unknown,
): DocumentUploadFailureReason {
  if (
    axios.isAxiosError<ApiErrorResponse>(error) &&
    error.response?.status === 400 &&
    error.response.data.message === unsupportedFileTypeMessage
  ) {
    return 'unsupportedFileType';
  }

  return 'unexpected';
}

/**
 * Uploads a document through the endpoint for its document type.
 * @param file - The file to upload
 * @param applicationId - The application that owns the document
 * @param documentType - The document category and endpoint selector
 * @returns The normalized upload result
 */
export async function uploadDocumentFile(
  file: File,
  applicationId: string,
  documentType: DocumentType,
): Promise<DocumentUploadResult> {
  try {
    const document =
      documentType === 'SignPlan'
        ? await createSignPlan(file, applicationId)
        : await createDocument(file, applicationId, documentType);

    return { document, status: 'fulfilled' };
  } catch (error) {
    return {
      reason: getDocumentUploadFailureReason(error),
      status: 'rejected',
    };
  }
}
