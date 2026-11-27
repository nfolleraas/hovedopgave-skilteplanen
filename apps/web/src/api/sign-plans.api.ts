import type { Document } from '../pages/documents-page/document.types.js';
import { apiClient } from './client.api.js';

type CreatedSignPlan = {
  documentId: string;
};

/**
 * Uploads a sign plan and retrieves its associated document.
 * @param file - The sign plan file to upload
 * @param applicationId - The application that owns the sign plan
 * @returns The document associated with the newly created sign plan
 */
export async function createSignPlan(
  file: File,
  applicationId: string,
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('applicationId', applicationId);
  formData.append('documentType', 'SignPlan');
  formData.append('signPlanType', 'AttachSpecificMarkingPlan');

  const signPlan = await apiClient.postForm<CreatedSignPlan>(
    '/sign-plans',
    formData,
  );

  return apiClient.get<Document>(`/documents/${signPlan.documentId}`);
}
