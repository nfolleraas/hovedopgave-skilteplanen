import type {
  DocumentUploadFailureReason,
  DocumentUploadResult,
} from '../../../api/document-upload.api.js';
import type { Document } from '../document.types.js';

export type DocumentUploadFailure = {
  count: number;
  reason: DocumentUploadFailureReason;
};

type DocumentUploadSummary = {
  documents: Document[];
  failures: DocumentUploadFailure[];
};

/**
 * Groups successful documents and counts failed uploads by reason.
 * @param results - The normalized upload results
 * @returns The successful documents and grouped failure counts
 */
export function summarizeDocumentUploads(
  results: DocumentUploadResult[],
): DocumentUploadSummary {
  const documents: Document[] = [];
  const failureCounts = new Map<DocumentUploadFailureReason, number>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      documents.push(result.document);
      continue;
    }

    failureCounts.set(
      result.reason,
      (failureCounts.get(result.reason) ?? 0) + 1,
    );
  }

  return {
    documents,
    failures: Array.from(failureCounts, ([reason, count]) => ({
      count,
      reason,
    })),
  };
}
