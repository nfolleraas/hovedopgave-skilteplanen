import type { Dispatch, SetStateAction } from 'react';
import type { ActorSubmission, SavedActor } from './actor.types.js';

export type ActorsPageContext = {
  actors: SavedActor[];
  setActors: Dispatch<SetStateAction<SavedActor[]>>;
  isLoading: boolean;
  loadFailed: boolean;
  retry: () => void;
  createActor: (actor: ActorSubmission) => Promise<void>;
  updateActor: (uuid: string, actor: ActorSubmission) => Promise<void>;
};
