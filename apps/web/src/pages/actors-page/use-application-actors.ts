import { useEffect, useState } from 'react';
import { createActor, getActors, updateActor } from '../../api/actors.api.js';
import { reportError } from '../../lib/report-error.js';
import type { SavedActor } from './actor.types.js';
import type { ActorsPageContext } from './actors-page.context.js';

/** Loads and saves actors belonging to the current application draft. */
export function useApplicationActors(caseNumber: string): ActorsPageContext {
  const [actors, setActors] = useState<SavedActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry reloads the current application's actors.
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setLoadFailed(false);
    async function loadActors(): Promise<void> {
      try {
        const saved = await getActors(controller.signal, caseNumber);
        if (!controller.signal.aborted) {
          setActors(saved);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          reportError('Loading application actors failed', error);
          setLoadFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }
    void loadActors();
    return () => controller.abort();
  }, [caseNumber, attempt]);

  return {
    actors,
    setActors,
    isLoading,
    loadFailed,
    retry: () => setAttempt((current) => current + 1),
    createActor: async (values) => {
      const saved = await createActor(caseNumber, values);
      setActors((current) => [...current, saved]);
    },
    updateActor: async (uuid, values) => {
      const saved = await updateActor(uuid, values);
      setActors((current) =>
        current.map((actor) => (actor.uuid === uuid ? saved : actor)),
      );
    },
  };
}
