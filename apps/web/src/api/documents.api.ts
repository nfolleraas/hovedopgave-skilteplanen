import type {
  Document,
  DocumentType,
} from '../pages/documents-page/document.types.js';
import { apiClient } from './client.api.js';

export async function getDocuments(): Promise<Document[]> {
  return apiClient.get<Document[]>('/documents');
}

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
