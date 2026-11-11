import type {
  ActorSubmission,
  SavedActor,
} from '../pages/actors-page/actor.types.js';
import { apiClient } from './client.api.js';

export function getActors(signal?: AbortSignal): Promise<SavedActor[]> {
  return apiClient.get<SavedActor[]>('/actors', signal);
}

export async function deleteActor(uuid: string): Promise<void> {
  await apiClient.delete(`/actors/${encodeURIComponent(uuid)}`);
}

export async function createActor(
  caseNumber: string,
  draft: ActorSubmission,
): Promise<SavedActor> {
  return apiClient.post<SavedActor>('/actors', {
    ...draft,
    applicationCaseNumber: caseNumber,
  });
}

export function updateActor(
  uuid: string,
  draft: ActorSubmission,
): Promise<SavedActor> {
  const { role: _role, ...update } = draft;
  return apiClient.patch<SavedActor>(
    `/actors/${encodeURIComponent(uuid)}`,
    update,
  );
}
