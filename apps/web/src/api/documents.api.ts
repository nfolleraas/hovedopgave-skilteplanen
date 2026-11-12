import type {
  Document,
  DocumentType,
} from '../pages/documents-page/document.types.js';
import { apiClient } from './client.api.js';

/**
 * Retrieves all documents available to the current application.
 * @returns The documents returned by the API
 */
export async function getDocuments(): Promise<Document[]> {
  return apiClient.get<Document[]>('/documents');
}

/**
 * Uploads a document and creates its metadata record.
 * @param file - The document file to upload
 * @param applicationId - The application that owns the document
 * @param documentType - The category assigned to the document
 * @returns The newly created document
 */
export async function createDocument(
  file: File,
  applicationId: string,
  documentType: DocumentType,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('applicationId', applicationId);
  formData.append('documentType', documentType);

  return apiClient.postForm<Document>('/documents', formData);
}

/**
 * Deletes a document by its unique identifier.
 * @param uuid - The document identifier
 * @returns A promise that resolves when the document has been deleted
 */
export async function deleteDocument(uuid: string): Promise<void> {
  await apiClient.delete<void>(`/documents/${uuid}`);
}
