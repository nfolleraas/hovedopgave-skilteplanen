import type { Dispatch, SetStateAction } from 'react';
import { useOutletContext } from 'react-router';
import type { ActorSubmission, SavedActor } from './actor.types.js';

export type ActorsPageContext = {
  actors: SavedActor[];
  setActors: Dispatch<SetStateAction<SavedActor[]>>;
  isLoading: boolean;
  loadFailed: boolean;
  retry: () => void;
  cancel: () => void;
  createActor: (caseNumber: string, actor: ActorSubmission) => Promise<void>;
  updateActor: (uuid: string, actor: ActorSubmission) => Promise<void>;
};

export function useActorsPage() {
  return useOutletContext<ActorsPageContext>();
}
