import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createDocument } from '../../../api/documents.api.js';
import { createSignPlan } from '../../../api/sign-plans.api.js';
import type { Document, DocumentType } from '../document.types.js';

type UseDocumentUploadOptions = {
  applicationId: string;
  documentType: DocumentType;
  onDocumentsUploaded: (documents: Document[]) => void;
};

/**
 * Manages document uploads and their user-facing status messages.
 * @param options - The upload target, document type, and completion callback
 * @returns Upload handlers and the current upload state
 */
export function useDocumentUpload({
  applicationId,
  documentType,
  onDocumentsUploaded,
}: UseDocumentUploadOptions) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Uploads the selected files and reports partial success or failure.
   * @param files - The files selected for upload
   * @returns A promise that resolves when all upload attempts are settled
   */
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || isUploading) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const uploadResults = await Promise.allSettled(
        files.map((file) =>
          documentType === 'SignPlan'
            ? createSignPlan(file, applicationId)
            : createDocument(file, applicationId, documentType),
        ),
      );
      const uploadedDocuments = uploadResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );

      if (uploadedDocuments.length > 0) {
        onDocumentsUploaded(uploadedDocuments);
        setSuccessMessage(
          t('documents.uploadSuccess', { count: uploadedDocuments.length }),
        );
      }

      if (uploadResults.some((result) => result.status === 'rejected')) {
        setError(
          documentType === 'SignPlan'
            ? t('documents.signPlanUploadError')
            : t('documents.uploadError'),
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Uploads files selected through the hidden file input.
   * @param event - The file input change event
   * @returns A promise that resolves when the selected files are processed
   */
  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    await uploadFiles(files);
  };

  return {
    error,
    setError,
    handleFileSelected,
    isUploading,
    successMessage,
    setSuccessMessage,
    uploadFiles,
  };
}
