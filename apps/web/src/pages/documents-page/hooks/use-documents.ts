import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDocuments } from '../../../api/documents.api.js';
import type { Document } from '../document.types.js';

export function useDocuments() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadStatusMessage, setLoadStatusMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    getDocuments()
      .then((loadedDocuments) => {
        if (isMounted) {
          setDocuments(loadedDocuments);
          setLoadStatusMessage(
            t('documents.loadSuccess', { count: loadedDocuments.length }),
          );
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(t('documents.loadError'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  const addDocuments = useCallback((uploadedDocuments: Document[]) => {
    setDocuments((currentDocuments) => [
      ...currentDocuments,
      ...uploadedDocuments,
    ]);
  }, []);

  const removeDocument = useCallback((uuid: string) => {
    setDocuments((currentDocuments) =>
      currentDocuments.filter((document) => document.uuid !== uuid),
    );
  }, []);

  return {
    addDocuments,
    documents,
    error,
    isLoading,
    loadStatusMessage,
    removeDocument,
  };
}
