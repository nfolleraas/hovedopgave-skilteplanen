import { useState } from 'react';
import {
  type DocumentUploadFailureReason,
  uploadDocumentFile,
} from '../../../api/document-upload.api.js';
import type { Document, DocumentType } from '../document.types.js';
import {
  type DocumentUploadFailure,
  summarizeDocumentUploads,
} from '../utils/summarize-document-uploads.js';

type UseDocumentUploadOptions = {
  applicationId: string;
  documentType: DocumentType;
  onDocumentsUploaded: (documents: Document[]) => void;
};

/**
 * Manages document upload state and reports completed uploads.
 * @param options - The upload target, document type, and completion callback
 * @returns Upload handlers and the current upload state
 */
export function useDocumentUpload({
  applicationId,
  documentType,
  onDocumentsUploaded,
}: UseDocumentUploadOptions) {
  const [failures, setFailures] = useState<DocumentUploadFailure[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [successfulUploadCount, setSuccessfulUploadCount] = useState(0);

  /**
   * Dismisses the upload alert for one failure reason.
   * @param reason - The failure reason to dismiss
   */
  const dismissFailure = (reason: DocumentUploadFailureReason) => {
    setFailures((currentFailures) =>
      currentFailures.filter((failure) => failure.reason !== reason),
    );
  };

  /**
   * Dismisses the successful upload status.
   */
  const dismissSuccess = () => {
    setSuccessfulUploadCount(0);
  };

  /**
   * Uploads the selected files and reports partial success or failure.
   * @param files - The files selected for upload
   * @returns A promise that resolves when all upload attempts are settled
   */
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0 || isUploading) {
      return;
    }

    setFailures([]);
    setSuccessfulUploadCount(0);
    setIsUploading(true);

    try {
      const uploadResults = await Promise.all(
        files.map((file) =>
          uploadDocumentFile(file, applicationId, documentType),
        ),
      );
      const summary = summarizeDocumentUploads(uploadResults);

      if (summary.documents.length > 0) {
        onDocumentsUploaded(summary.documents);
        setSuccessfulUploadCount(summary.documents.length);
      }

      setFailures(summary.failures);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    dismissFailure,
    dismissSuccess,
    failures,
    isUploading,
    successfulUploadCount,
    uploadFiles,
  };
}
