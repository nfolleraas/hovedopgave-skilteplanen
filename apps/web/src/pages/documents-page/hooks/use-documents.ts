import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDocuments } from '../../../api/documents.api.js';
import type { Document } from '../document.types.js';

export type DocumentsState = {
  addDocuments: (uploadedDocuments: Document[]) => void;
  documents: Document[];
  error: string | null;
  isLoading: boolean;
  loadStatusMessage: string;
  removeDocument: (uuid: string) => void;
};

type ApplicationDocumentsState = Omit<
  DocumentsState,
  'addDocuments' | 'removeDocument'
> & {
  applicationId: string;
};

function emptyDocumentsState(applicationId: string): ApplicationDocumentsState {
  return {
    applicationId,
    documents: [],
    error: null,
    isLoading: true,
    loadStatusMessage: '',
  };
}

/**
 * Loads documents and manages local additions and removals.
 * @param applicationId - The application whose documents should be loaded
 * @returns The document collection, status, and update callbacks
 */
export function useDocuments(applicationId: string): DocumentsState {
  const { t } = useTranslation();
  const [state, setState] = useState<ApplicationDocumentsState>(() =>
    emptyDocumentsState(applicationId),
  );
  const currentState =
    state.applicationId === applicationId
      ? state
      : emptyDocumentsState(applicationId);

  useEffect(() => {
    let isMounted = true;
    setState(emptyDocumentsState(applicationId));

    getDocuments(applicationId)
      .then((loadedDocuments) => {
        if (isMounted) {
          setState({
            applicationId,
            documents: loadedDocuments,
            error: null,
            isLoading: false,
            loadStatusMessage: t('documents.loadSuccess', {
              count: loadedDocuments.length,
            }),
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setState({
            ...emptyDocumentsState(applicationId),
            error: t('documents.loadError'),
            isLoading: false,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [applicationId, t]);

  /**
   * Appends newly uploaded documents to the local collection.
   * @param uploadedDocuments - The documents to append
   */
  const addDocuments = useCallback(
    (uploadedDocuments: Document[]) => {
      setState((current) => ({
        ...(current.applicationId === applicationId
          ? current
          : emptyDocumentsState(applicationId)),
        documents: [
          ...(current.applicationId === applicationId ? current.documents : []),
          ...uploadedDocuments,
        ],
        isLoading: false,
      }));
    },
    [applicationId],
  );

  /**
   * Removes a document from the local collection.
   * @param uuid - The identifier of the document to remove
   */
  const removeDocument = useCallback(
    (uuid: string) => {
      setState((current) => ({
        ...(current.applicationId === applicationId
          ? current
          : emptyDocumentsState(applicationId)),
        documents:
          current.applicationId === applicationId
            ? current.documents.filter((document) => document.uuid !== uuid)
            : [],
        isLoading: false,
      }));
    },
    [applicationId],
  );

  return {
    addDocuments,
    documents: currentState.documents,
    error: currentState.error,
    isLoading: currentState.isLoading,
    loadStatusMessage: currentState.loadStatusMessage,
    removeDocument,
  };
}
