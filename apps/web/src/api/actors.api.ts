import type {
  ActorDraft,
  SavedActor,
} from '../pages/actors-page/actor.types.js';
import { apiClient } from './client.js';

export function getActors(signal?: AbortSignal): Promise<SavedActor[]> {
  return apiClient.get<SavedActor[]>('/actors', signal);
}

export async function createActor(
  caseNumber: string,
  draft: ActorDraft,
): Promise<SavedActor> {
  return apiClient.post<SavedActor>('/actors', {
    ...draft,
    applicationCaseNumber: caseNumber,
  });
}
